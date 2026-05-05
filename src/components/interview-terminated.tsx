
// Full-screen takeover rendered when isTerminated === true.
// Exits fullscreen before navigating so the browser returns to normal.

import { ShieldX } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface InterviewTerminatedProps {
  interviewId: string;
}

export const InterviewTerminated = ({
  interviewId,
}: InterviewTerminatedProps) => {
  const navigate = useNavigate();

  const leave = (to: string) => {
    // Always exit fullscreen first
    if (document.fullscreenElement) {
      document.exitFullscreen().finally(() => navigate(to));
    } else {
      navigate(to);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gray-950 text-center px-6">
      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-red-950 flex items-center justify-center mb-6">
        <ShieldX className="w-10 h-10 text-red-400" />
      </div>

      <h1 className="text-2xl font-bold text-white mb-3">
        Interview Terminated
      </h1>
      <p className="text-sm text-gray-400 leading-relaxed max-w-xs mb-10">
        Your interview was ended because you exceeded the maximum number of
        allowed warnings. Your answers up to this point have been saved.
      </p>

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => leave(`/generate/feedback/${interviewId}`)}
          className="w-full bg-white text-gray-900 font-semibold py-3 rounded-xl hover:bg-gray-100 transition-colors text-sm"
        >
          View Partial Feedback
        </button>
        <button
          onClick={() => leave("/generate")}
          className="w-full border border-gray-700 text-gray-400 font-medium py-3 rounded-xl hover:border-gray-500 hover:text-gray-300 transition-colors text-sm"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};