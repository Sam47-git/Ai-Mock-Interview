
// Shown whenever a violation occurs.
// - Warnings 1 & 2: dismissable, auto-hides after 8 s
// - Warning 3 (pinned): fullscreen-exit variant cannot be dismissed until
//   the user re-enters fullscreen; tab-switch variant shows a "I understand" button.
// - No close (×) button once pinned.

import { AlertTriangle } from "lucide-react";
import type { ViolationType } from "@/hooks/use-proctoring";

interface ProctoringModalProps {
  warningCount: number;
  maxWarnings: number;
  violationType: ViolationType;
  isPinned: boolean;
  onDismiss: () => void;
  onReEnterFullscreen: () => void;
}

// What to show for each violation type
const COPY: Record<ViolationType, { heading: string; body: string }> = {
  tab_switch: {
    heading: "Tab Switch Detected",
    body: "You navigated away from the interview window. This is a proctoring violation.",
  },
  fullscreen_exit: {
    heading: "Fullscreen Exited",
    body: "You must stay in fullscreen for the duration of the interview.",
  },
};

export const ProctoringModal = ({
  warningCount,
  maxWarnings,
  violationType,
  isPinned,
  onDismiss,
  onReEnterFullscreen,
}: ProctoringModalProps) => {
  const copy = COPY[violationType];
  const remaining = maxWarnings - warningCount;

  return (
    // Backdrop — pointer-events-none on backdrop so clicks fall through
    // but the card itself captures all events
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="relative w-full max-w-[420px] mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Colored top stripe */}
        <div
          className={`h-1.5 w-full ${isPinned ? "bg-red-600" : "bg-orange-500"}`}
        />

        <div className="p-7">
          {/* Icon + heading */}
          <div className="flex items-start gap-4 mb-5">
            <div
              className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center ${
                isPinned ? "bg-red-100" : "bg-orange-100"
              }`}
            >
              <AlertTriangle
                className={`w-5 h-5 ${isPinned ? "text-red-600" : "text-orange-600"}`}
              />
            </div>

            <div>
              <h2 className="text-base font-bold text-gray-900">
                {copy.heading}
              </h2>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                {copy.body}
              </p>
            </div>
          </div>

          {/* Warning pip row */}
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xs text-gray-400 font-medium mr-1">
              Warnings
            </span>
            {Array.from({ length: maxWarnings }).map((_, i) => (
              <div
                key={i}
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[11px] font-bold transition-colors ${
                  i < warningCount
                    ? "bg-red-500 border-red-500 text-white"
                    : "border-gray-200 text-gray-300"
                }`}
              >
                {i + 1}
              </div>
            ))}
            <span className="text-xs text-gray-400 ml-1">
              {remaining === 0
                ? "No warnings left — next violation ends your interview"
                : `${remaining} remaining`}
            </span>
          </div>

          {/* Final-warning callout (only when pinned) */}
          {isPinned && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium leading-relaxed">
              ⚠&nbsp; This is your <strong>final warning</strong>. Any further
              violation will immediately end the interview with no recovery.
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2.5">
            {violationType === "fullscreen_exit" && (
              <button
                onClick={onReEnterFullscreen}
                className="w-full bg-gray-900 hover:bg-gray-800 active:scale-[0.98] text-white text-sm font-semibold py-3 rounded-xl transition-all"
              >
                Re-enter Fullscreen &amp; Continue
              </button>
            )}

            {violationType === "tab_switch" && (
              <button
                onClick={onDismiss}
                className="w-full bg-gray-900 hover:bg-gray-800 active:scale-[0.98] text-white text-sm font-semibold py-3 rounded-xl transition-all"
              >
                I Understand — Continue Interview
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};