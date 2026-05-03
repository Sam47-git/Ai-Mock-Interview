import {
  CircleStop,
  Loader,
  Mic,
  RefreshCw,
  Save,
  Video,
  VideoOff,
  WebcamIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import useSpeechToText, { type ResultType } from "react-hook-speech-to-text";
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
  isWebCam,
  setIsWebCam,
  onSaved,
}: RecordAnswerProps) => {
  const {
    interimResult,
    isRecording,
    results,
    startSpeechToText,
    stopSpeechToText,
  } = useSpeechToText({
    continuous: true,
    useLegacyResults: false,
  });

  const [userAnswer, setUserAnswer] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<AIResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFirstRestart = useRef(true);

  const isRecordingIntended = useRef(false);

  const { userId } = useAuth();
  const { interviewId } = useParams();

  useEffect(() => {
    if (!isRecording && isRecordingIntended.current) {
      if (!isFirstRestart.current) {
        toast("Mic Reconnected", {
          description: "Microphone dropped and has been automatically restarted.",
        });
      }
      isFirstRestart.current = false;
      startSpeechToText();
    }
  }, [isRecording, startSpeechToText]);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
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

  useEffect(() => {
    // Reset everything when the question changes so old recordings don't carry over
    isRecordingIntended.current = false;
    isFirstRestart.current = true;
    stopSpeechToText();
    setUserAnswer("");
    setAiResult(null);
    setRecordingSeconds(0);
  }, [question.question, stopSpeechToText]);

  const recordUserAnswer = async () => {
    if (isRecording) {
      isRecordingIntended.current = false;
      stopSpeechToText();

      if (userAnswer?.length < 30) {
        toast.error("Error", {
          description: "Your answer should be more than 30 characters",
        });

        return;
      }

      //   ai result
      const aiResult = await generateResult(
        question.question,
        question.answer,
        userAnswer
      );

      setAiResult(aiResult);
    } else {
      isRecordingIntended.current = true;
      startSpeechToText();
    }
  };

  const generateResult = async (
    qst: string,
    qstAns: string,
    userAns: string
  ): Promise<AIResponse> => {
    setIsAiGenerating(true);
    const prompt = `
      You are a strict technical interviewer. Evaluate the user's answer briefly and return ONLY a JSON object — no extra text, no markdown.

      Question: "${qst}"
      User Answer: "${userAns}"
      Correct Answer: "${qstAns}"

      Score using this rubric:
      - "accuracy": 0–2 (0=wrong, 1=partially correct, 2=correct)
      - "completeness": 0–2 (0=missing key points, 1=partially covered, 2=well covered)
      - "clarity": 0–1 (0=unclear, 1=clear)
      - "rating": accuracy + completeness + clarity (number, max 5)
      - "feedback": MAX 3 sentences. Start with what was good, then state the 1–2 most important missing points only.

      Return ONLY this JSON:
      {"accuracy":number,"completeness":number,"clarity":number,"rating":number,"feedback":"string"}
    `;

    try {
      const freshSession = createChatSession();
      const aiResult = await freshSession.sendMessage(prompt);

      const parsedResult: AIResponse = parseAiJson<AIResponse>(
        aiResult.response.text()
      );
      return parsedResult;
    } catch (error) {
      console.log(error);
      toast("Error", {
        description: "An error occurred while generating feedback.",
      });
      return {
        accuracy: 0,
        completeness: 0,
        clarity: 0,
        rating: 0,
        feedback: "Unable to generate feedback",
      };
    } finally {
      setIsAiGenerating(false);
    }
  };

  const recordNewAnswer = () => {
    setUserAnswer("");
    setAiResult(null);
    isRecordingIntended.current = false;
    stopSpeechToText();
    setTimeout(() => {
      isRecordingIntended.current = true;
      startSpeechToText();
    }, 300);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const saveUserAnswer = async () => {
    if (!aiResult) {
      return;
    }

    setLoading(true);

    const currentQuestion = question.question;
    try {
      // query the firbase to check if the user answer already exists for this question

      const userAnswerQuery = query(
        collection(db, "userAnswers"),
        where("userId", "==", userId),
        where("question", "==", currentQuestion),
        where("mockIdRef", "==", interviewId)
      );

      const querySnap = await getDocs(userAnswerQuery);

      // if the user already answerd the question dont save it again
      if (!querySnap.empty) {
        console.log("Query Snap Size", querySnap.size);
        toast.info("Already Answered", {
          description: "You have already answered this question",
        });
        return;
      } else {
        // save the user answer

        await addDoc(collection(db, "userAnswers"), {
          mockIdRef: interviewId,
          question: question.question,
          correct_ans: question.answer,
          user_ans: userAnswer,
          feedback: aiResult.feedback,
          rating: aiResult.rating,
          accuracy: aiResult.accuracy,
          completeness: aiResult.completeness,
          clarity: aiResult.clarity,
          userId,
          createdAt: serverTimestamp(),
        });

        toast("Saved", { description: "Your answer has been saved.." });
        onSaved?.();
      }

      setUserAnswer("");
      stopSpeechToText();
    } catch (error) {
      toast("Error", {
        description: "An error occurred while generating feedback.",
      });
      console.log(error);
    } finally {
      setLoading(false);
      setOpen(!open);
    }
  };

  useEffect(() => {
    const combineTranscripts = results
      .filter((result): result is ResultType => typeof result !== "string")
      .map((result) => result.transcript)
      .join(" ");

    setUserAnswer(combineTranscripts);
  }, [results]);

  return (
    <div className="w-full flex flex-col items-center gap-8 mt-4">
      {/* save modal */}
      <SaveModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={saveUserAnswer}
        loading={loading}
      />

      <div className="w-full h-[400px] md:w-96 flex flex-col items-center justify-center border p-4 bg-gray-50 rounded-md">
        {isWebCam ? (
          <WebCam
            onUserMedia={() => setIsWebCam(true)}
            onUserMediaError={() => setIsWebCam(false)}
            className="w-full h-full object-cover rounded-md"
          />
        ) : (
          <WebcamIcon className="min-w-24 min-h-24 text-muted-foreground" />
        )}
      </div>

      <div className="flex itece justify-center gap-3">
        <TooltipButton
          content={isWebCam ? "Turn Off" : "Turn On"}
          icon={
            isWebCam ? (
              <VideoOff className="min-w-5 min-h-5" />
            ) : (
              <Video className="min-w-5 min-h-5" />
            )
          }
          onClick={() => setIsWebCam(!isWebCam)}
        />

        <div className="relative flex flex-col items-center">
          {isRecording && (
            <span className="absolute -inset-1 rounded-full animate-ping bg-red-400 opacity-50" />
          )}
          <TooltipButton
            content={isRecording ? "Stop Recording" : "Start Recording"}
            icon={
              isRecording ? (
                <CircleStop className="min-w-5 min-h-5 text-red-500" />
              ) : (
                <Mic className="min-w-5 min-h-5" />
              )
            }
            onClick={recordUserAnswer}
          />
          {isRecording && (
            <span className="text-xs text-red-500 font-mono mt-1">
              {formatTime(recordingSeconds)}
            </span>
          )}
        </div>

        <TooltipButton
          content="Record Again"
          icon={<RefreshCw className="min-w-5 min-h-5" />}
          onClick={recordNewAnswer}
        />

        <TooltipButton
          content="Save Result"
          icon={
            isAiGenerating ? (
              <Loader className="min-w-5 min-h-5 animate-spin" />
            ) : (
              <Save className="min-w-5 min-h-5" />
            )
          }
          onClick={() => setOpen(!open)}
          disabled={!aiResult}
        />
      </div>

      <div className="w-full mt-4 p-4 border rounded-md bg-gray-50">
        <h2 className="text-lg font-semibold">Your Answer:</h2>

        <p className="text-sm mt-2 text-gray-700 whitespace-normal">
          {userAnswer || "Start recording to see your answer here"}
        </p>

        {interimResult && (
          <p className="text-sm text-gray-500 mt-2">
            <strong>Current Speech:</strong>
            {interimResult}
          </p>
        )}
      </div>
    </div>
  );
};

export default RecordAnswer;