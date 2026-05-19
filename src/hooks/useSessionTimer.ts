import { useEffect, useRef } from "react";

import { useSessionStore } from "@/store/session";

/**
 * Wall-clock timer that drives the session timer.
 *
 * We use `Date.now()` instead of a naive `setInterval` countdown so the timer
 * stays accurate even when the tab is throttled (background) — on resume,
 * we charge the elapsed gap once.
 */
export function useSessionTimer() {
  const tick = useSessionStore((s) => s.tick);
  const sessionExists = useSessionStore((s) => !!s.session);
  const sessionEnded = useSessionStore((s) => s.session?.ended ?? true);
  const sessionFullyLearned = useSessionStore((s) => s.session?.fullyLearned ?? false);
  const lastTickRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!sessionExists || sessionEnded || sessionFullyLearned) return;
    lastTickRef.current = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      tick(delta);
    }, 1000);
    return () => window.clearInterval(id);
  }, [sessionExists, sessionEnded, sessionFullyLearned, tick]);
}
