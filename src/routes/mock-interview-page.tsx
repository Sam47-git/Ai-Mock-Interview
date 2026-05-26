
// Live interview page. Proctoring is active as soon as this mounts.
// No header, no breadcrumbs, no nav — rendered inside InterviewLayout.
//
// Flow:
//   1. useProctoring hook starts listening for violations
//   2. Any violation → ProctoringModal overlays the screen
//   3. 3rd violation → modal is pinned (can't dismiss without re-entering FS)
//   4. 4th violation → <InterviewTerminated> replaces the entire page

import { useParams } from "react-router-dom";
import { LoaderPage } from "./loader-page";
import { QuestionSection } from "@/components/question-section";
import { useInterview } from "@/hooks/use-interview";
import { useProctoring } from "@/hooks/use-proctoring";
import { ProctoringModal } from "@/components/proctoring-modal";
import { InterviewTerminated } from "@/components/interview-terminated";

const MockInterviewPage = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const { interview, isLoading } = useInterview(interviewId);

  // enabled: true — monitoring starts immediately on mount
  const proctoring = useProctoring({ enabled: true, maxWarnings: 3 });

  if (isLoading) return <LoaderPage className="w-full h-[70vh]" />;

  // ── Terminal state ────────────────────────────────────────────────────────
  if (proctoring.isTerminated) {
    return <InterviewTerminated interviewId={interviewId!} />;
  }

  return (
    <>
      {/* Violation modal — rendered on top of everything when visible */}
      {proctoring.showModal && proctoring.activeViolation && (
        <ProctoringModal
          warningCount={proctoring.warningCount}
          maxWarnings={proctoring.maxWarnings}
          violationType={proctoring.activeViolation}
          isPinned={proctoring.isPinned}
          onDismiss={proctoring.dismissModal}
          onReEnterFullscreen={proctoring.requestFullscreen}
        />
      )}

      {/* Interview content — no breadcrumbs, no info banners, no nav */}
      {(() => {
        if (!Array.isArray(interview?.questions) || interview.questions.length === 0) {
          return (
            <div className="text-center p-8 text-muted-foreground">
              No questions found. Please go back and try again.
            </div>
          );
        }
        return (
          <QuestionSection
            questions={interview.questions}
            interviewId={interviewId!}
          />
        );
      })()}
    </>
  );
};

export default MockInterviewPage;