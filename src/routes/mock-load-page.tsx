import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import WebCam from "react-webcam";
import {
  Lightbulb,
  Loader,
  Maximize2,
  Mic,
  RefreshCw,
  Sparkles,
  WebcamIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import CustomBreadCrumb from "@/components/custom-bread-crumb";
import InterviewPin from "@/components/pin";
import { LoaderPage } from "./loader-page";
import { useInterview } from "@/hooks/use-interview";
import { useAuth } from "@clerk/react";
import { toast } from "sonner";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/config/firebase.config";
import { createGenerationSession } from "@/scripts";
import { parseAiJson, questionsSchema } from "@/lib/ai-utils";
import type { QuestionsResult } from "@/lib/ai-utils";
import { ZodError } from "zod";

const MockLoadPage = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const { interview, isLoading } = useInterview(interviewId);
  const { userId } = useAuth();
  const navigate = useNavigate();

  // ── Pre-flight permission state ──────────────────────────────────────────
  const [webcamReady, setWebcamReady] = useState(false);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [micChecking, setMicChecking] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const micStreamRef = useRef<MediaStream | null>(null);

  // ── Has-completed detection ──────────────────────────────────────────────
  const [hasCompleted, setHasCompleted] = useState(false);
  const [checkingCompletion, setCheckingCompletion] = useState(true);

  // ── Try Again re-generation state ────────────────────────────────────────
  const [isRegenerating, setIsRegenerating] = useState(false);

  // ── Sync fullscreen state ────────────────────────────────────────────────
  useEffect(() => {
    const sync = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  // ── Release mic stream on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ── Check if interview was previously completed ──────────────────────────
  useEffect(() => {
    if (!interviewId || !userId) return;
    getDocs(
      query(
        collection(db, "userAnswers"),
        where("mockIdRef", "==", interviewId),
        where("userId", "==", userId)
      )
    )
      .then((snap) => setHasCompleted(!snap.empty))
      .catch(() => setHasCompleted(false))
      .finally(() => setCheckingCompletion(false));
  }, [interviewId, userId]);

  // ── Step handlers ────────────────────────────────────────────────────────
  const handleEnableWebcam = () => {
    if (!webcamEnabled) setWebcamEnabled(true);
  };

  const handleRequestMic = async () => {
    if (micReady || micChecking) return;
    setMicChecking(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      setMicReady(true);
    } catch (err: any) {
      const isDenied =
        err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError";
      toast.error("Microphone Access Denied", {
        description: isDenied
          ? "Please allow microphone permission in your browser settings and try again."
          : "Could not access microphone. Check that no other app is using it.",
      });
      setMicReady(false);
    } finally {
      setMicChecking(false);
    }
  };

  const handleEnterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      /* user denied */
    }
  };

  // ── Start interview ──────────────────────────────────────────────────────
  const canStart = webcamReady && micReady && isFullscreen;

  const handleStart = () => {
    if (!canStart) return;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    navigate(`/generate/interview/${interviewId}/start`, {
      state: { isWebCamEnabled: true },
    });
  };

  // ── Try Again — delete answers + regenerate questions ───────────────────
  const handleTryAgain = async () => {
    if (!canStart || !interview || !interviewId || !userId) return;
    setIsRegenerating(true);
    try {
      // Delete previous answers
      const snap = await getDocs(
        query(
          collection(db, "userAnswers"),
          where("mockIdRef", "==", interviewId),
          where("userId", "==", userId)
        )
      );
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));

      // Generate new questions — voice-based, no coding questions
      const prompt = `
        You are an experienced technical interviewer conducting a VOICE-BASED mock interview.
        Users will answer questions by speaking — they cannot write or run code.

        STRICT RULES — follow every one:
        1. Generate EXACTLY 5 questions, no more, no fewer.
        2. Questions must be CONCEPTUAL, BEHAVIORAL, or VERBAL EXPLANATION only.
        3. Do NOT ask questions that require writing, typing, or running actual code.
           BAD:  "Write a function to reverse a string."
           BAD:  "Code a binary search algorithm."
           GOOD: "How would you approach reversing a string, and what is the time complexity?"
           GOOD: "Explain how binary search works and when you would use it."
        4. Instead of "Write/Code/Implement X", ask "Explain how you would approach X"
           or "What is your understanding of X and how does it work?"
        5. Generate DIFFERENT questions from any previous set — vary the topics and difficulty.
        6. Cover a mix of: conceptual understanding, real-world application,
           problem-solving approach, and experience-based questions.

        Job Position: ${interview.position}
        Job Description: ${interview.description}
        Years of Experience: ${interview.experience}
        Tech Stacks: ${interview.techStack}

        Respond with ONLY this exact JSON shape with exactly 5 questions:
        {"questions": ["question 1", "question 2", "question 3", "question 4", "question 5"]}
        Each question must be a plain string.
        Do not use objects like {"question": "..."} inside the array.
        No markdown, no code fences, no preamble.
      `;

      const session = createGenerationSession();
      const aiResult = await session.sendMessage(prompt);
      let newQuestions: QuestionsResult;
      try {
        newQuestions = parseAiJson<QuestionsResult>(
          aiResult.response.text(),
          questionsSchema
        );
      } catch (error: any) {
        if (error instanceof SyntaxError) {
          toast.error("Failed to generate questions. Please try again.");
        } else if (error instanceof ZodError) {
          toast.error("AI returned unexpected data. Please try again.");
        }
        throw error;
      }

      await updateDoc(doc(db, "interviews", interviewId), {
        questions: newQuestions.questions,
      });

      toast.success("New questions ready!", {
        description: "Starting a fresh interview with different questions.",
      });

      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      navigate(`/generate/interview/${interviewId}/start`, {
        state: { isWebCamEnabled: true },
      });
    } catch (error) {
      console.error(error);
      toast.error("Error", {
        description: "Could not generate new questions. Please try again.",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  if (isLoading || checkingCompletion) {
    return <LoaderPage className="w-full h-[70vh]" />;
  }

  const handleAction = hasCompleted ? handleTryAgain : handleStart;
  const actionLabel = isRegenerating
    ? "Generating new questions..."
    : hasCompleted
    ? "Try Again"
    : "Start Interview";
  const actionIcon = isRegenerating ? (
    <Loader className="w-4 h-4 animate-spin" />
  ) : hasCompleted ? (
    <RefreshCw className="w-4 h-4" />
  ) : (
    <Sparkles className="w-4 h-4" />
  );

  return (
    <div className="flex flex-col w-full gap-8 py-5">
      {/* Breadcrumb */}
      <CustomBreadCrumb
        breadCrumbPage={interview?.position || ""}
        breadCrumbItems={[{ label: "Mock Interviews", link: "/generate" }]}
      />

      {/* Interview info card */}
      {interview && <InterviewPin interview={interview} onMockPage />}

      {/* Rules / info banner */}
      <Alert className="bg-yellow-100/60 border-yellow-200 p-4 rounded-lg flex items-start gap-3 -mt-3">
        <Lightbulb className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
        <div>
          <AlertTitle className="text-yellow-800 font-semibold">
            {hasCompleted ? "Ready to try again?" : "Before You Begin"}
          </AlertTitle>
          <AlertDescription className="text-sm text-yellow-700 mt-1 leading-relaxed">
            {hasCompleted ? (
              <p>
                You've completed this interview before. Click{" "}
                <strong>Try Again</strong> to get a brand-new set of questions.
                Your previous answers will be cleared.
              </p>
            ) : (
              <>
                <p>
                  Grant all three permissions below before starting. This
                  prevents unnecessary warnings during the interview.
                </p>
                <ul className="list-disc list-inside mt-1.5 space-y-1">
                  <li>Stay in fullscreen — do not exit or switch tabs.</li>
                  <li>
                    You have <strong>3 warnings</strong>. A 4th violation ends
                    the interview.
                  </li>
                  <li>
                    Your video and audio are <strong>never recorded</strong>.
                  </li>
                </ul>
              </>
            )}
          </AlertDescription>
        </div>
      </Alert>

      {/* Webcam preview */}
      <div className="flex justify-center">
        <div className="w-full max-w-sm h-64 border rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
          {webcamEnabled ? (
            <WebCam
              onUserMedia={() => setWebcamReady(true)}
              onUserMediaError={() => {
                setWebcamReady(false);
                setWebcamEnabled(false);
              }}
              className="w-full h-full object-cover"
            />
          ) : (
            <WebcamIcon className="w-16 h-16 text-gray-400" />
          )}
        </div>
      </div>

      {/* Three-step checklist */}
      <div className="flex flex-col items-center gap-3">

        {/* Step 1 — Webcam */}
        <button
          onClick={handleEnableWebcam}
          disabled={webcamReady}
          className={`w-full max-w-sm flex items-center gap-3 px-5 py-3.5 rounded-xl border-2 font-medium text-sm transition-all ${
            webcamReady
              ? "border-emerald-400 bg-emerald-50 text-emerald-700 cursor-default"
              : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 cursor-pointer"
          }`}
        >
          <StepPip done={webcamReady} n={1} />
          {webcamReady ? "Webcam active ✓" : "Enable Webcam"}
        </button>

        {/* Step 2 — Microphone */}
        <button
          onClick={handleRequestMic}
          disabled={micReady || micChecking}
          className={`w-full max-w-sm flex items-center gap-3 px-5 py-3.5 rounded-xl border-2 font-medium text-sm transition-all ${
            micReady
              ? "border-emerald-400 bg-emerald-50 text-emerald-700 cursor-default"
              : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 cursor-pointer"
          }`}
        >
          <StepPip done={micReady} n={2} loading={micChecking} />
          {micReady ? (
            "Microphone active ✓"
          ) : micChecking ? (
            "Requesting permission..."
          ) : (
            <span className="flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Enable Microphone
            </span>
          )}
        </button>

        {/* Step 3 — Fullscreen */}
        <button
          onClick={handleEnterFullscreen}
          disabled={isFullscreen}
          className={`w-full max-w-sm flex items-center gap-3 px-5 py-3.5 rounded-xl border-2 font-medium text-sm transition-all ${
            isFullscreen
              ? "border-emerald-400 bg-emerald-50 text-emerald-700 cursor-default"
              : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
          }`}
        >
          <StepPip done={isFullscreen} n={3} />
          {isFullscreen ? (
            "Fullscreen active ✓"
          ) : (
            <span className="flex items-center gap-2">
              <Maximize2 className="w-4 h-4" />
              Enter Fullscreen
            </span>
          )}
        </button>

        {/* Start / Try Again button */}
        <button
          onClick={handleAction}
          disabled={!canStart || isRegenerating}
          className={`mt-2 w-full max-w-sm flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm transition-all ${
            canStart && !isRegenerating
              ? "bg-gray-900 text-white hover:bg-gray-800 shadow-md"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          {actionLabel}
          {actionIcon}
        </button>

        {/* Helper text when button locked */}
        {!canStart && (
          <p className="text-xs text-gray-400 text-center">
            {[
              !webcamReady && "webcam",
              !micReady && "microphone",
              !isFullscreen && "fullscreen",
            ]
              .filter(Boolean)
              .join(", ")
              .replace(/,([^,]*)$/, " and$1") + " required to continue"}
          </p>
        )}
      </div>
    </div>
  );
};

// Reusable step pip
const StepPip = ({
  done,
  n,
  loading = false,
}: {
  done: boolean;
  n: number;
  loading?: boolean;
}) => (
  <span
    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
      done ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500"
    }`}
  >
    {loading ? (
      <Loader className="w-3 h-3 animate-spin text-gray-500" />
    ) : done ? (
      "✓"
    ) : (
      n
    )}
  </span>
);

export default MockLoadPage;