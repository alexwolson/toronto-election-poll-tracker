import { useSyncExternalStore } from "react";

/** Polls close at 20:00 EDT on Monday Oct 26, 2026, and the count begins (#17, #13). */
export const RESULTS_LIVE_AT = Date.parse("2026-10-26T20:00:00-04:00");

// setTimeout overflows past about 24.8 days; a page open that long before the
// night simply keeps its wording until the next load.
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

export function resultsLive(nowMs: number): boolean {
  return nowMs >= RESULTS_LIVE_AT;
}

function subscribe(onChange: () => void): () => void {
  const wait = RESULTS_LIVE_AT - Date.now();
  if (wait <= 0 || wait > MAX_TIMEOUT_MS) return () => {};
  const timer = setTimeout(onChange, wait);
  return () => clearTimeout(timer);
}

/**
 * Whether the results are live by the reader's clock. Static pages prerender
 * the before-8 p.m. state, and the browser corrects it on load and at 8 p.m.
 * It never fetches anything: only the `/results/` pages poll (#13).
 */
export function useResultsLive(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => resultsLive(Date.now()),
    () => false,
  );
}
