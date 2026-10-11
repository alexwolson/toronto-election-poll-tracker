import { useSyncExternalStore } from "react";

/** Polls close at 20:00 EDT on Monday Oct 26, 2026, and the count begins (#17, #13). */
export const RESULTS_LIVE_AT = Date.parse("2026-10-26T20:00:00-04:00");

/** A fixed time after the planned Night Close (Tue Oct 27, about 07:00 EDT): from here the
 *  results are "unofficial", never "live". True whether or not Night Close was declared (#54). */
export const RESULTS_UNOFFICIAL_AT = Date.parse("2026-10-27T12:00:00-04:00");

export type ResultsPhase = "before" | "live" | "unofficial";

// setTimeout overflows past about 24.8 days; a page open that long before the
// night simply keeps its wording until the next load.
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

export function resultsPhase(nowMs: number): ResultsPhase {
  if (nowMs < RESULTS_LIVE_AT) return "before";
  return nowMs < RESULTS_UNOFFICIAL_AT ? "live" : "unofficial";
}

export function resultsLive(nowMs: number): boolean {
  return resultsPhase(nowMs) === "live";
}

function subscribe(onChange: () => void): () => void {
  const now = Date.now();
  const next = [RESULTS_LIVE_AT, RESULTS_UNOFFICIAL_AT].find((at) => at > now);
  if (next === undefined || next - now > MAX_TIMEOUT_MS) return () => {};
  const timer = setTimeout(onChange, next - now);
  return () => clearTimeout(timer);
}

/**
 * The results' phase by the reader's clock. Static pages prerender the
 * before-8 p.m. state, and the browser corrects it on load and at each change.
 * It never fetches anything: only the `/results/` pages poll (#13).
 */
export function useResultsPhase(): ResultsPhase {
  return useSyncExternalStore(
    subscribe,
    () => resultsPhase(Date.now()),
    () => "before",
  );
}

/** Whether the results are live by the reader's clock: from 8 p.m. Oct 26 to the cut-off. */
export function useResultsLive(): boolean {
  return useResultsPhase() === "live";
}
