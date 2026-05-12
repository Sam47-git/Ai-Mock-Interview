import { CircleStop, Loader, Mic, RefreshCw, Save } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import WebCam from "react-webcam";
import { toast } from "sonner";
import { parseAiJson } from "@/lib/ai-utils";
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
import { createChatSession } from "@/scripts";

interface RecordAnswerProps {
  question: { question: string; answer: string };
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

  // true while the user wants to be recording (survives browser auto-stops)
  const isRecordingRef = useRef(false);

  // true only when the USER explicitly clicked Stop — tells onend to finalize
  const userStoppedRef = useRef(false);

  const finalTranscriptRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Always-current refs so onend closures never go stale
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
      // Don't update isRecordingRef here — it's already set before .start()
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
      // "aborted" = we called rec.abort() ourselves, ignore
      if (event.error === "aborted") return;
      // "no-speech" = browser auto-paused, onend will restart it
      if (event.error === "no-speech") return;

      console.error("Speech error:", event.error);
      isRecordingRef.current = false;
      userStoppedRef.current = true; // prevent restart loop on real errors
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
      // CASE 1 — User deliberately clicked Stop: finalize and generate feedback
      if (userStoppedRef.current) {
        userStoppedRef.current = false;
        isRecordingRef.current = false;
        setIsRecording(false);

        const answer = finalTranscriptRef.current.trim();
        if (answer.length < 30) {
          toast.error("Answer too short", {
            description: "Record at least 30 characters before saving.",
          });
          return;
        }

        const currentQuestion = questionRef.current;
        setIsAiGeneratingRef.current(true);

        const prompt = `
          You are a strict technical interviewer. Evaluate the user's answer briefly
          and return ONLY a JSON object — no extra text, no markdown.

          Question: "${currentQuestion.question}"
          User Answer: "${answer}"
          Correct Answer: "${currentQuestion.answer}"

          Score using this rubric:
          - "accuracy": 0-2 (0=wrong, 1=partially correct, 2=correct)
          - "completeness": 0-2 (0=missing key points, 1=partially covered, 2=well covered)
          - "clarity": 0-1 (0=unclear, 1=clear)
          - "rating": accuracy + completeness + clarity (number, max 5)
          - "feedback": MAX 3 sentences. Start with what was good,
            then the 1-2 most important missing points only.

          Return ONLY this JSON:
          {"accuracy":number,"completeness":number,"clarity":number,"rating":number,"feedback":"string"}
        `;

        try {
          const session = createChatSession();
          const result = await session.sendMessage(prompt);
          const parsed = parseAiJson<AIResponse>(result.response.text());
          setAiResultRef.current(parsed);
        } catch (err: any) {
          console.error("generateResult error:", err);
          toast.error("Feedback error", {
            description: "Could not generate feedback. Try recording again.",
          });
        } finally {
          setIsAiGeneratingRef.current(false);
        }

        return;
      }

      // CASE 2 — Browser auto-stopped (silence timeout) but user is still recording:
      // Restart recognition transparently so the Stop button stays visible
      if (isRecordingRef.current) {
        try {
          rec.start();
        } catch {
          // start() can throw if already started — safe to ignore
        }
        return;
      }

      // CASE 3 — Something else ended it (question change reset, etc.)
      setIsRecording(false);
    };

    recognitionRef.current = rec;
    return () => {
      isRecordingRef.current = false;
      userStoppedRef.current = true; // prevent restart on unmount
      rec.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(
        () => setRecordingSeconds((s) => s + 1),
        1000
      );
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setRecordingSeconds(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  // ── Reset when question changes ───────────────────────────────────────────
  useEffect(() => {
    isRecordingRef.current = false;
    userStoppedRef.current = true; // stop restart loop
    recognitionRef.current?.abort();
    setIsRecording(false);
    finalTranscriptRef.current = "";
    setUserAnswer("");
    setInterimText("");
    setAiResult(null);
    setRecordingSeconds(0);
    // Re-arm for next question
    setTimeout(() => { userStoppedRef.current = false; }, 100);
  }, [question.question]);

  // ── Start recording ───────────────────────────────────────────────────────
  const startRecording = () => {
    if (!recognitionRef.current || isRecordingRef.current) return;
    finalTranscriptRef.current = "";
    setUserAnswer("");
    setInterimText("");
    setAiResult(null);
    userStoppedRef.current = false;
    isRecordingRef.current = true;
    recognitionRef.current.start();
  };

  // ── Stop recording (user-initiated) ──────────────────────────────────────
  const stopRecording = () => {
    if (!recognitionRef.current || !isRecordingRef.current) return;
    userStoppedRef.current = true;  // tells onend to finalize, not restart
    recognitionRef.current.stop();
    // UI updates (setIsRecording false) happen in onend after transcripts flush
  };

  // ── Record Again ──────────────────────────────────────────────────────────
  const recordNewAnswer = useCallback(() => {
    isRecordingRef.current = false;
    userStoppedRef.current = true;
    recognitionRef.current?.abort();
    setIsRecording(false);
    finalTranscriptRef.current = "";
    setUserAnswer("");
    setInterimText("");
    setAiResult(null);
    setTimeout(() => {
      userStoppedRef.current = false;
      isRecordingRef.current = true;
      recognitionRef.current?.start();
    }, 200);
  }, []);

  // ── Save to Firestore ─────────────────────────────────────────────────────
  const saveUserAnswer = async () => {
    if (!aiResult) return;
    setLoading(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, "userAnswers"),
          where("userId", "==", userId),
          where("question", "==", question.question),
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
        question: question.question,
        correct_ans: question.answer,
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
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60)
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

      {/* Webcam — always on */}
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

        {/* Stop — shown only while recording, with red pulse + timer */}
        {isRecording && (
          <div className="relative flex flex-col items-center">
            <span className="absolute -inset-1 rounded-full animate-ping bg-red-400 opacity-50" />
            <TooltipButton
              content="Stop Recording"
              icon={<CircleStop className="min-w-5 min-h-5 text-red-500" />}
              onClick={stopRecording}
              disabled={isAiGenerating}
            />
            <span className="text-xs text-red-500 font-mono mt-1">
              {formatTime(recordingSeconds)}
            </span>
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

      {/* AI feedback preview */}
      {aiResult && (
        <div className="w-full p-4 border border-emerald-200 rounded-md bg-emerald-50">
          <p className="text-xs font-semibold text-emerald-700 mb-1">
            AI Feedback — Rating: {aiResult.rating} / 5
          </p>
          <p className="text-sm text-emerald-800">{aiResult.feedback}</p>
        </div>
      )}
    </div>
  );
};

export default RecordAnswer;