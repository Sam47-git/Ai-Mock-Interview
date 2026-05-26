import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Volume2, VolumeX } from "lucide-react";
import TooltipButton from "./tooltip-button";
import RecordAnswer from "./record-answer";

interface QuestionSectionProps {
  questions: string[];
  interviewId: string;
}

export const QuestionSection = ({ questions, interviewId }: QuestionSectionProps) => {
  const { state } = useLocation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isWebCam, setIsWebCam] = useState(state?.isWebCamEnabled ?? false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [savedQuestions, setSavedQuestions] = useState<number[]>([]);
  const navigate = useNavigate();

  const [currentSpeech, setCurrentSpeech] =
    useState<SpeechSynthesisUtterance | null>(null);

  // FIX: was passing questions[activeIndex]?.question (undefined on strings)
  // Now passes the string directly
  const handlePlayQuestion = (qst: string) => {
    if (!qst) return;
    if (isPlaying && currentSpeech) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setCurrentSpeech(null);
    } else {
      if ("speechSynthesis" in window) {
        const speech = new SpeechSynthesisUtterance(qst);
        window.speechSynthesis.speak(speech);
        setIsPlaying(true);
        setCurrentSpeech(speech);
        speech.onend = () => {
          setIsPlaying(false);
          setCurrentSpeech(null);
        };
      }
    }
  };

  const handleNext = () => {
    if (activeIndex < questions.length - 1) {
      setActiveIndex(activeIndex + 1);
    }
  };

  const handleSkip = () => {
    if (activeIndex < questions.length - 1) {
      setActiveIndex(activeIndex + 1);
    } else {
      navigate(`/generate/feedback/${interviewId}`);
    }
  };

  const handleSubmit = () => {
    navigate(`/generate/feedback/${interviewId}`);
  };

  const handleQuestionSaved = () => {
    setSavedQuestions((prev) => [...prev, activeIndex]);
  };

  const activeQuestion = questions[activeIndex] ?? "";

  return (
    <div className="w-full min-h-96 border rounded-md p-4 space-y-6">

      {/* Step indicator row with action button on the right */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2 flex-wrap">
          {questions.map((_, i) => {
            const isClickable = i <= activeIndex || savedQuestions.includes(i);

            return (
              <div
                key={i}
                onClick={() => {
                  if (isClickable) setActiveIndex(i);
                }}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border",
                  i === activeIndex
                    ? "bg-emerald-500 text-white border-emerald-500"
                    : savedQuestions.includes(i)
                    ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                    : "bg-gray-100 text-gray-500 border-gray-300",
                  isClickable ? "cursor-pointer" : "cursor-not-allowed"
                )}
              >
                {savedQuestions.includes(i) ? `✓ Q${i + 1}` : `Q${i + 1}`}
              </div>
            );
          })}
        </div>

        {/* Single action button — top right */}
        <div className="ml-4 shrink-0">
          {(() => {
            const isLastQuestion = activeIndex === questions.length - 1;
            const isSaved = savedQuestions.includes(activeIndex);

            if (isLastQuestion && isSaved) {
              return (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-4 py-1.5 bg-emerald-600 text-white text-sm rounded-md hover:bg-emerald-700"
                >
                  Submit
                </button>
              );
            }

            if (isLastQuestion && !isSaved) {
              return (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="px-4 py-1.5 text-sm text-gray-500 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Skip & Submit
                </button>
              );
            }

            if (!isLastQuestion && isSaved) {
              return (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 py-1.5 bg-emerald-600 text-white text-sm rounded-md hover:bg-emerald-700"
                >
                  Next →
                </button>
              );
            }

            return (
              <button
                type="button"
                onClick={handleSkip}
                className="px-4 py-1.5 text-sm text-gray-500 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Skip
              </button>
            );
          })()}
        </div>
      </div>

      {/* Current question text */}
      <p className="text-base text-left tracking-wide text-neutral-500">
        {activeQuestion}
      </p>

      {/* Play button — FIX: pass activeQuestion (string) not .question (undefined) */}
      <div className="w-full flex items-center justify-end">
        <TooltipButton
          content={isPlaying ? "Stop" : "Read question aloud"}
          icon={
            isPlaying ? (
              <VolumeX className="min-w-5 min-h-5 text-muted-foreground" />
            ) : (
              <Volume2 className="min-w-5 min-h-5 text-muted-foreground" />
            )
          }
          onClick={() => handlePlayQuestion(activeQuestion)}
        />
      </div>

      {/* Record Answer — passes plain string, RecordAnswer handles it */}
      <RecordAnswer
        question={activeQuestion}
        isWebCam={isWebCam}
        setIsWebCam={setIsWebCam}
        onSaved={handleQuestionSaved}
      />
    </div>
  );
};

export default QuestionSection;