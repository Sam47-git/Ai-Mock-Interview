import { CircleStop, Loader, Mic, RefreshCw, Save } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import WebCam from "react-webcam";
import { toast } from "sonner";
import { ZodError } from "zod";
import { parseAiJson, evaluationSchema } from "@/lib/ai-utils";
import type { EvaluationResult } from "@/lib/ai-utils";
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/config/firebase.config";
import TooltipButton from "./tooltip-button";
import { useAuth } from "@clerk/react";
import SaveModal from "./save-model";
import { createEvaluationSession } from "@/scripts";

interface RecordAnswerProps {
  question: { question: string; answer: string } | string;
  isWebCam: boolean;
  setIsWebCam: (value: boolean) => void;
  onSaved?: () => void;
}

interface AIResponse {
  accuracy: number;
  completeness: number;
  clarity: number;
  rating: number;
  feedback: string;
}

const getQuestionText = (q: RecordAnswerProps["question"]): string =>
  typeof q === "string" ? q : q?.question ?? "";

const getAnswerText = (q: RecordAnswerProps["question"]): string =>
  typeof q === "string" ? "" : q?.answer ?? "";

const RecordAnswer = ({
  question,
  isWebCam: _isWebCam,
  setIsWebCam,
  onSaved,
}: RecordAnswerProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [userAnswer, setUserAnswer] = useState("");
  const [interimText, setInterimText] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<AIResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const recognitionRef = useRef<any>(null);
  const MAX_RECORDING_SECONDS = 180;
  const isRecordingRef = useRef(false);
  const userStoppedRef = useRef(false);
  const skipEvaluationRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const questionRef = useRef(question);
  useEffect(() => { questionRef.current = question; }, [question]);

  const setAiResultRef = useRef(setAiResult);
  const setIsAiGeneratingRef = useRef(setIsAiGenerating);

  const { userId } = useAuth();
  const { interviewId } = useParams();

  // ── Build recognition instance once ──────────────────────────────────────
  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SR) {
      toast.error("Browser not supported", {
        description: "Speech recognition needs Chrome or Edge.",
      });
      return;
    }

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onstart = () => {
      isRecordingRef.current = true;
      setIsRecording(true);
    };

    rec.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += t + " ";
        } else {
          interim += t;
        }
      }
      setInterimText(interim);
      setUserAnswer(finalTranscriptRef.current + interim);
    };

    rec.onerror = (event: any) => {
      if (event.error === "aborted") return;
      if (event.error === "no-speech") return;
      console.error("Speech error:", event.error);
      isRecordingRef.current = false;
      userStoppedRef.current = true;
      setIsRecording(false);
      if (event.error === "not-allowed") {
        toast.error("Microphone denied", {
          description: "Allow microphone in browser settings then reload.",
        });
      } else {
        toast.error("Mic error", { description: `Error: ${event.error}` });
      }
    };

    rec.onend = async () => {
      // CASE 1 — User deliberately clicked Stop
      if (userStoppedRef.current) {
        userStoppedRef.current = false;
        isRecordingRef.current = false;
        setIsRecording(false);

        // before calling abort() so we skip evaluation here entirely
        if (skipEvaluationRef.current) {
          skipEvaluationRef.current = false;
          return;
        }

        const answer = finalTranscriptRef.current.trim();
        if (answer.length < 30) {
          toast.error("Answer too short", {
            description: "Record at least 30 characters before saving.",
          });
          return;
        }

        const currentQuestion = questionRef.current;
        const questionText = getQuestionText(currentQuestion);
        const answerText = getAnswerText(currentQuestion);

        setIsAiGeneratingRef.current(true);

        const prompt = `
          You are a strict technical interviewer. Evaluate the user's answer briefly
          and return ONLY a JSON object — no extra text, no markdown.

          Question: "${questionText}"
          User Answer: "${answer}"
          Correct Answer: "${answerText}"

          Score using this rubric:
          - "accuracy": 0-2 (0=wrong, 1=partially correct, 2=correct)
          - "completeness": 0-2 (0=missing key points, 1=partially covered, 2=well covered)
          - "clarity": 0-1 (0=unclear, 1=clear)
          - "feedback": MAX 3 sentences. Start with what was good,
            then the 1-2 most important missing points only.

          Do NOT include a rating field.

          Return ONLY this JSON:
          {"accuracy":number,"completeness":number,"clarity":number,"feedback":"string"}
        `;

        try {
          const session = createEvaluationSession();
          const result = await session.sendMessage(prompt);
          const parsed = parseAiJson(result.response.text(), evaluationSchema);
          const rating = Math.min(5, Math.max(0,
            parsed.accuracy + parsed.completeness + parsed.clarity
          ));
          const safeResult: EvaluationResult & { rating: number } = {
            ...parsed,
            rating,
          };
          setAiResultRef.current(safeResult);
          // No toast here — Save button becoming active is the signal to the user
        } catch (err: any) {
          console.error("generateResult error:", err);
          if (err instanceof SyntaxError) {
            toast.error("Could not parse AI feedback. Please try again.");
          } else if (err instanceof ZodError) {
            toast.error("AI returned unexpected data. Please try again.");
          } else {
            toast.error("Feedback error", {
              description: "Could not generate feedback. Try recording again.",
            });
          }
        } finally {
          setIsAiGeneratingRef.current(false);
        }

        return;
      }

      // CASE 2 — Browser auto-stopped but user is still recording: restart
      if (isRecordingRef.current) {
        try {
          rec.start();
        } catch {
          // safe to ignore
        }
        return;
      }

      // CASE 3 — Something else ended it
      setIsRecording(false);
    };

    recognitionRef.current = rec;
    return () => {
      isRecordingRef.current = false;
      userStoppedRef.current = true;
      rec.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Stop recording ────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    userStoppedRef.current = true;
    isRecordingRef.current = false;
    setIsRecording(false);
    setRecordingSeconds(0);

    recognitionRef.current.stop();
  }, []);

  const stopRecordingRef = useRef(stopRecording);
  useEffect(() => { stopRecordingRef.current = stopRecording; }, [stopRecording]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => {
          const next = s + 1;
          if (next >= MAX_RECORDING_SECONDS) {
            toast.info("Max recording time reached", {
              description: "Recording stopped automatically after 3 minutes.",
            });
            stopRecordingRef.current();
          }
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // ── Reset when question changes ───────────────────────────────────────────
  const activeQuestionText = getQuestionText(question);
  useEffect(() => {
    isRecordingRef.current = false;
    userStoppedRef.current = true;
  
    // show the "Answer too short" toast when the question changes
    skipEvaluationRef.current = true;
    recognitionRef.current?.abort();
    setIsRecording(false);
    finalTranscriptRef.current = "";
    setUserAnswer("");
    setInterimText("");
    setAiResult(null);
    setRecordingSeconds(0);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setTimeout(() => { userStoppedRef.current = false; }, 100);
  }, [activeQuestionText]); // Bug 5 fix: variable reference, not inline call

  // ── Start recording ───────────────────────────────────────────────────────
  const startRecording = () => {
    if (!recognitionRef.current || isRecordingRef.current) return;
    finalTranscriptRef.current = "";
    setUserAnswer("");
    setInterimText("");
    setAiResult(null);
    userStoppedRef.current = false;
    isRecordingRef.current = true;
    setIsRecording(true);
    try {
      recognitionRef.current.start();
    } catch {
      isRecordingRef.current = false;
      setIsRecording(false);
    }
  };

  // ── Record Again ──────────────────────────────────────────────────────────
  const recordNewAnswer = useCallback(() => {
    isRecordingRef.current = false;
    userStoppedRef.current = true;
    // show the "Answer too short" toast for this intentional reset
    skipEvaluationRef.current = true;
    recognitionRef.current?.abort();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setIsRecording(false);
    finalTranscriptRef.current = "";
    setUserAnswer("");
    setInterimText("");
    setAiResult(null);
    setRecordingSeconds(0);
    setTimeout(() => {
      userStoppedRef.current = false;
      isRecordingRef.current = true;
      recognitionRef.current?.start();
    }, 200);
  }, []);

  // ── Save to Firestore ─────────────────────────────────────────────────────
  const saveUserAnswer = async () => {
    const questionText = getQuestionText(question);
    const answerText = getAnswerText(question);

    if (!aiResult || !userId || !interviewId || !questionText) {
      console.error("Save blocked — missing required values:", {
        aiResult: !!aiResult,
        userId,
        interviewId,
        questionText,
      });
      toast.error("Could not save. Missing interview data.");
      return;
    }

    setLoading(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, "userAnswers"),
          where("userId", "==", userId),
          where("question", "==", questionText),
          where("mockIdRef", "==", interviewId)
        )
      );
      if (!snap.empty) {
        toast.info("Already saved", {
          description: "You already saved an answer for this question.",
        });
        return;
      }
      await addDoc(collection(db, "userAnswers"), {
        mockIdRef: interviewId,
        question: questionText,
        correct_ans: answerText,
        user_ans: finalTranscriptRef.current.trim(),
        feedback: aiResult.feedback,
        rating: aiResult.rating,
        accuracy: aiResult.accuracy,
        completeness: aiResult.completeness,
        clarity: aiResult.clarity,
        userId,
        createdAt: serverTimestamp(),
      });
      toast.success("Saved", { description: "Your answer has been saved." });
      onSaved?.();
      finalTranscriptRef.current = "";
      setUserAnswer("");
    } catch (err) {
      toast.error("Save failed", { description: "Could not save. Try again." });
      console.error(err);
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "00")}:${(s % 60)
      .toString()
      .padStart(2, "0")}`;

  return (
    <div className="w-full flex flex-col items-center gap-8 mt-4">
      <SaveModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={saveUserAnswer}
        loading={loading}
      />

      {/* Webcam */}
      <div className="relative w-full h-[400px] md:w-96">
        <WebCam
          onUserMedia={() => setIsWebCam(true)}
          onUserMediaError={() => setIsWebCam(false)}
          className="w-full h-full object-cover rounded-md border"
        />
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/50 rounded-full px-2.5 py-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          <span className="text-[10px] font-semibold text-white tracking-wide">
            LIVE
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">

        {/* Mic — shown only when NOT recording */}
        {!isRecording && (
          <TooltipButton
            content="Start Recording"
            icon={<Mic className="min-w-5 min-h-5" />}
            onClick={startRecording}
            disabled={isAiGenerating}
          />
        )}

        {/* Stop — plain button to guarantee click fires */}
        {isRecording && (
          <div className="relative">
            <span className="absolute -inset-1 rounded-full animate-ping bg-red-400 opacity-50 pointer-events-none" />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                stopRecording();
              }}
              disabled={isAiGenerating}
              className="relative z-10 p-2 rounded-full bg-white border border-red-300 hover:bg-red-50 disabled:opacity-50 transition"
              title="Stop Recording"
            >
              <CircleStop className="min-w-5 min-h-5 text-red-500" />
            </button>
          </div>
        )}

        {/* Record Again */}
        <TooltipButton
          content="Record Again"
          icon={<RefreshCw className="min-w-5 min-h-5" />}
          onClick={recordNewAnswer}
          disabled={isAiGenerating || isRecording}
        />

        {/* Save */}
        <TooltipButton
          content={
            isAiGenerating
              ? "Generating feedback..."
              : aiResult
              ? "Save Result"
              : "Record an answer first"
          }
          icon={
            isAiGenerating ? (
              <Loader className="min-w-5 min-h-5 animate-spin" />
            ) : (
              <Save className="min-w-5 min-h-5" />
            )
          }
          onClick={() => setOpen(true)}
          disabled={!aiResult || isAiGenerating}
        />
      </div>

      {/* Timer */}
      {isRecording && (
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs text-red-500 font-mono">
            {formatTime(recordingSeconds)} / {formatTime(MAX_RECORDING_SECONDS)}
          </div>
          <div className="w-24 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-400 transition-all duration-1000"
              style={{
                width: `${(recordingSeconds / MAX_RECORDING_SECONDS) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* AI generating indicator */}
      {isAiGenerating && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader className="w-4 h-4 animate-spin" />
          <span>Generating feedback, please wait...</span>
        </div>
      )}

      {/* Transcript */}
      <div className="w-full p-4 border rounded-md bg-gray-50">
        <h2 className="text-lg font-semibold">Your Answer:</h2>
        <p className="text-sm mt-2 text-gray-700 whitespace-pre-wrap">
          {userAnswer || "Start recording to see your answer here"}
        </p>
        {interimText && (
          <p className="text-sm text-gray-400 mt-2 italic">{interimText}</p>
        )}
      </div>
    </div>
  );
};

export default RecordAnswer;