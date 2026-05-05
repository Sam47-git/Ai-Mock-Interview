

import { useCallback, useEffect, useRef, useState } from "react";

export type ViolationType = "tab_switch" | "fullscreen_exit";

export interface Warning {
  id: number;
  type: ViolationType;
  timestamp: Date;
}

export interface ProctoringState {
  warningCount: number;
  isPinned: boolean;
  showModal: boolean;
  activeViolation: ViolationType | null;
  warnings: Warning[];
  isTerminated: boolean;
}

interface UseProctoringOptions {
  enabled: boolean;
  maxWarnings?: number;
}

export function useProctoring({
  enabled,
  maxWarnings = 3,
}: UseProctoringOptions) {
  const [state, setState] = useState<ProctoringState>({
    warningCount: 0,
    isPinned: false,
    showModal: false,
    activeViolation: null,
    warnings: [],
    isTerminated: false,
  });

  const enabledRef = useRef(enabled);
  const warningCountRef = useRef(0);
  const isTerminatedRef = useRef(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // KEY FIX: tracks whether we ourselves called requestFullscreen()
  // so we can ignore the resulting fullscreenchange event
  const reEnteringRef = useRef(false);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // ─── Core violation handler ───────────────────────────────────────────────
  const triggerViolation = useCallback(
    (type: ViolationType) => {
      if (!enabledRef.current || isTerminatedRef.current) return;

      const nextCount = warningCountRef.current + 1;

      if (nextCount > maxWarnings) {
        isTerminatedRef.current = true;
        setState((prev) => ({ ...prev, isTerminated: true, showModal: false }));
        return;
      }

      warningCountRef.current = nextCount;
      const newWarning: Warning = { id: nextCount, type, timestamp: new Date() };
      const willPin = nextCount >= maxWarnings;

      setState((prev) => ({
        ...prev,
        warningCount: nextCount,
        isPinned: willPin,
        showModal: true,
        activeViolation: type,
        warnings: [...prev.warnings, newWarning],
      }));

      // Auto-dismiss after 8 s for non-pinned warnings
      if (!willPin) {
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = setTimeout(() => {
          setState((prev) =>
            prev.isPinned
              ? prev
              : { ...prev, showModal: false, activeViolation: null }
          );
        }, 8000);
      }
    },
    [maxWarnings]
  );

  // ─── Tab-switch detection ─────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const handle = () => {
      if (document.visibilityState === "hidden") triggerViolation("tab_switch");
    };
    document.addEventListener("visibilitychange", handle);
    return () => document.removeEventListener("visibilitychange", handle);
  }, [enabled, triggerViolation]);

  // ─── Fullscreen-exit detection ────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const handle = () => {
      // Ignore the event if WE triggered the re-entry
      if (reEnteringRef.current) {
        reEnteringRef.current = false;
        return;
      }
      // Only fire when fullscreen is lost (element === null)
      if (!document.fullscreenElement) {
        triggerViolation("fullscreen_exit");
      }
    };
    document.addEventListener("fullscreenchange", handle);
    return () => document.removeEventListener("fullscreenchange", handle);
  }, [enabled, triggerViolation]);

  // ─── Block browser back / forward ────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    window.history.pushState(null, "", window.location.href);
    const onPop = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [enabled]);

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const dismissModal = useCallback(() => {
    setState((prev) => {
      if (prev.isPinned && prev.activeViolation === "fullscreen_exit")
        return prev; // can't dismiss pinned fullscreen warning without re-entering
      return { ...prev, showModal: false, activeViolation: null };
    });
  }, []);

  const requestFullscreen = useCallback(async () => {
    reEnteringRef.current = true; // mark so we skip the resulting event
    try {
      await document.documentElement.requestFullscreen();
      // Once successfully in fullscreen, also close the modal
      setState((prev) => ({ ...prev, showModal: false, activeViolation: null }));
    } catch {
      reEnteringRef.current = false; // reset if it failed
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  return {
    ...state,
    maxWarnings,
    isCurrentlyFullscreen: !!document.fullscreenElement,
    triggerViolation,
    dismissModal,
    requestFullscreen,
    exitFullscreen,
  };
}