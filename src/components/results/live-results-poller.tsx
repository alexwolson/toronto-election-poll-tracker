"use client";

/**
 * The browser side of the live pages (#17 § Browser): polls `/live/results.json`
 * every 60 s on the same origin, so readers on the production domain never touch
 * `*.vercel.app` (research 05 §6), and applies each poll through the pure accept
 * rule.
 *
 * The provider sits in the `/results/` layout, which persists across the ward
 * pages, so opening another ward renders from the payload already held, with no
 * fetch (#17 § Payload).
 */

import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import { acceptPoll, INITIAL_LIVE_STATE, type LiveClientState } from "@/lib/live-accept";
import { LiveResultsView, type LiveResultsViewProps } from "./live-results-view";

const LIVE_URL = "/live/results.json";
const POLL_INTERVAL_MS = 60_000;
/** A hung request counts as a failed poll, and ends before the next one starts. */
const POLL_TIMEOUT_MS = 20_000;

/** The parsed body, or null for any network, timeout, status or JSON failure. */
async function fetchLive(): Promise<unknown> {
  try {
    // Skip the browser's HTTP cache; the CDN's ISR copy is what collapses load.
    const response = await fetch(LIVE_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(POLL_TIMEOUT_MS),
    });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

interface LiveResultsContextValue {
  state: LiveClientState;
  /** The reader's clock at the last poll, for the staleness banner. */
  now: number;
}

const LiveResultsContext = createContext<LiveResultsContextValue>({ state: INITIAL_LIVE_STATE, now: 0 });

export function LiveResultsProvider({ children }: { children: ReactNode }) {
  const [state, apply] = useReducer(acceptPoll, INITIAL_LIVE_STATE);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let active = true;
    async function poll() {
      const body = await fetchLive();
      if (!active) return;
      apply(body);
      setNow(Date.now());
    }
    void poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const value = useMemo(() => ({ state, now }), [state, now]);
  return <LiveResultsContext.Provider value={value}>{children}</LiveResultsContext.Provider>;
}

/** A results page: the held payload, shown for the page's ward. */
export function ResultsBallot(props: Omit<LiveResultsViewProps, "state" | "now">) {
  const { state, now } = useContext(LiveResultsContext);
  return <LiveResultsView state={state} now={now} {...props} />;
}
