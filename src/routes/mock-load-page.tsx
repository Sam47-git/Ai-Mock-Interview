

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import WebCam from "react-webcam";
import {
  Lightbulb,
  Loader,
  Maximize2,
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
  getDocs,
  query,
  updateDoc,
  doc,
  where,
} from "firebase/firestore";
import { db } from "@/config/firebase.config";
import { createChatSession } from "@/scripts";
import { parseAiJson } from "@/lib/ai-utils";

const MockLoadPage = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const { interview, isLoading } = useInterview(interviewId);
  const { userId } = useAuth();
  const navigate = useNavigate();

  // Pre-flight state
  const [webcamReady, setWebcamReady] = useState(false);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Has-completed state
  const [hasCompleted, setHasCompleted] = useState(false);
  const [checkingCompletion, setCheckingCompletion] = useState(true);

  // Try-again re-generation state
  const [isRegenerating, setIsRegenerating] = useState(false);

  // ── Keep isFullscreen in sync with the real browser state ────────────────
  useEffect(() => {
    const sync = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  // ── Check if this interview was previously completed ──────────────────────
  useEffect(() => {
    if (!interviewId || !userId) return;

    const check = async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "userAnswers"),
            where("mockIdRef", "==", interviewId),
            where("userId", "==", userId)
          )
        );
        setHasCompleted(!snap.empty);
      } catch {
        // If query fails, default to not-completed — user can still start
        setHasCompleted(false);
      } finally {
        setCheckingCompletion(false);
      }
    };

    check();
  }, [interviewId, userId]);

  // ── Fullscreen helper ─────────────────────────────────────────────────────
  const handleEnterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      /* user denied */
    }
  };

  // ── Webcam toggle (enable only — can't disable once on) ──────────────────
  const handleEnableWebcam = () => {
    if (!webcamEnabled) setWebcamEnabled(true);
  };

  // ── Start interview ───────────────────────────────────────────────────────
  const canStart = webcamReady && isFullscreen;

  const handleStart = () => {
    if (!canStart) return;
    navigate(`/generate/interview/${interviewId}/start`, {
      state: { isWebCamEnabled: true },
    });
  };

  // ── Try Again — regenerate questions then start ───────────────────────────
  const handleTryAgain = async () => {
    if (!canStart || !interview || !interviewId || !userId) return;
    setIsRegenerating(true);

    try {
      // 1. Delete previous answers for this interview
      const answersSnap = await getDocs(
        query(
          collection(db, "userAnswers"),
          where("mockIdRef", "==", interviewId),
          where("userId", "==", userId)
        )
      );
      await Promise.all(answersSnap.docs.map((d) => deleteDoc(d.ref)));

      // 2. Generate fresh questions via Gemini
      const prompt = `
        As an experienced prompt engineer, generate a JSON array containing
        5 technical interview questions along with detailed answers based on
        the following job information. Each object in the array should have
        the fields "question" and "answer", formatted as follows:

        [
          { "question": "<Question text>", "answer": "<Answer text>" },
          ...
        ]

        Job Information:
        - Job Position: ${interview.position}
        - Job Description: ${interview.description}
        - Years of Experience Required: ${interview.experience}
        - Tech Stacks: ${interview.techStack}

        The questions should assess skills in ${interview.techStack} development
        and best practices, problem-solving, and experience handling complex
        requirements. Please format the output strictly as an array of JSON
        objects without any additional labels, code blocks, or explanations.
        Return only the JSON array with questions and answers.
        Generate DIFFERENT questions from any previous set — vary the topics
        and difficulty to give a fresh interview experience.
      `;

      const session = createChatSession();
      const aiResult = await session.sendMessage(prompt);
      const newQuestions = parseAiJson<{ question: string; answer: string }[]>(
        aiResult.response.text()
      );

      // 3. Update the interview document with new questions
      await updateDoc(doc(db, "interviews", interviewId), {
        questions: newQuestions,
      });

      toast.success("New questions ready!", {
        description: "Starting a fresh interview with different questions.",
      });

      // 4. Navigate to the interview
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

  const canStart_label = webcamReady && isFullscreen;
  const actionLabel = hasCompleted ? "Try Again" : "Start Interview";
  const actionIcon = isRegenerating ? (
    <Loader className="w-4 h-4 animate-spin" />
  ) : hasCompleted ? (
    <RefreshCw className="w-4 h-4" />
  ) : (
    <Sparkles className="w-4 h-4" />
  );
  const handleAction = hasCompleted ? handleTryAgain : handleStart;

  return (
    <div className="flex flex-col w-full gap-8 py-5">
      {/* Breadcrumb */}
      <CustomBreadCrumb
        breadCrumbPage={interview?.position || ""}
        breadCrumbItems={[{ label: "Mock Interviews", link: "/generate" }]}
      />

      {/* Interview info card */}
      {interview && <InterviewPin interview={interview} onMockPage />}

      {/* Rules banner */}
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
                <strong>Try Again</strong> to get a brand-new set of questions
                and start fresh. Your previous answers will be cleared.
              </p>
            ) : (
              <>
                <p>Complete both steps below to unlock the Start button.</p>
                <ul className="list-disc list-inside mt-1.5 space-y-1">
                  <li>Keep your webcam on for the entire interview.</li>
                  <li>Stay in fullscreen — do not exit or switch tabs.</li>
                  <li>
                    You have <strong>3 warnings</strong>. A 4th violation ends
                    the interview immediately.
                  </li>
                </ul>
                <p className="mt-1">
                  <strong>Note:</strong> Your video is{" "}
                  <strong>never recorded</strong>.
                </p>
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

      {/* Two-step checklist + action button */}
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

        {/* Step 2 — Fullscreen */}
        <button
          onClick={handleEnterFullscreen}
          disabled={isFullscreen}
          className={`w-full max-w-sm flex items-center gap-3 px-5 py-3.5 rounded-xl border-2 font-medium text-sm transition-all ${
            isFullscreen
              ? "border-emerald-400 bg-emerald-50 text-emerald-700 cursor-default"
              : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
          }`}
        >
          <StepPip done={isFullscreen} n={2} />
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
          disabled={!canStart_label || isRegenerating}
          className={`mt-2 w-full max-w-sm flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm transition-all ${
            canStart_label && !isRegenerating
              ? "bg-gray-900 text-white hover:bg-gray-800 shadow-md"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          {isRegenerating ? "Generating new questions..." : actionLabel}
          {actionIcon}
        </button>

        {!canStart_label && (
          <p className="text-xs text-gray-400 text-center">
            {!webcamReady && !isFullscreen
              ? "Enable your webcam and fullscreen to continue"
              : !webcamReady
              ? "Enable your webcam to continue"
              : "Enter fullscreen to continue"}
          </p>
        )}
      </div>
    </div>
  );
};

// Reusable step pip
const StepPip = ({ done, n }: { done: boolean; n: number }) => (
  <span
    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
      done ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500"
    }`}
  >
    {done ? "✓" : n}
  </span>
);

export default MockLoadPage;