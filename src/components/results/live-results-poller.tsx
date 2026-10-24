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

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import { acceptPoll, INITIAL_LIVE_STATE, type LiveClientState } from "@/lib/live-accept";
import { validateLiveHistory } from "@/lib/live-history";
import type { LiveHistory } from "@/types/live";

const LIVE_URL = "/live/results.json";
const POLL_INTERVAL_MS = 60_000;
/** A hung request counts as a failed poll, and ends before the next one starts. */
const POLL_TIMEOUT_MS = 20_000;
/** The count over the night (live-projection #103): only while the Map or Count view is open. */
const HISTORY_URL = "/live/history.json";
const HISTORY_INTERVAL_MS = 120_000;

/** The parsed body, or null for any network, timeout, status or JSON failure. */
async function fetchLive(url = LIVE_URL): Promise<unknown> {
  try {
    // Skip the browser's HTTP cache; the CDN's ISR copy is what collapses load.
    const response = await fetch(url, {
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
  /** The newest valid history, kept across views and ward pages; null before the first. */
  history: LiveHistory | null;
  /** Registers a view that draws the history; returns its release. */
  watchHistory: () => () => void;
}

const LiveResultsContext = createContext<LiveResultsContextValue | null>(null);

export function LiveResultsProvider({ children }: { children: ReactNode }) {
  const [state, apply] = useReducer(acceptPoll, INITIAL_LIVE_STATE);
  const [now, setNow] = useState(0);
  const [history, setHistory] = useState<LiveHistory | null>(null);
  const [watchers, setWatchers] = useState(0);
  const watchHistory = useCallback(() => {
    setWatchers((n) => n + 1);
    return () => setWatchers((n) => n - 1);
  }, []);

  const watching = watchers > 0;
  useEffect(() => {
    if (!watching) return;
    let active = true;
    async function poll() {
      const next = validateLiveHistory(await fetchLive(HISTORY_URL));
      // A failed or invalid poll keeps the history already held.
      if (active && next !== null) setHistory(next);
    }
    void poll();
    const timer = setInterval(poll, HISTORY_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [watching]);

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

  const value = useMemo(() => ({ state, now, history, watchHistory }), [state, now, history, watchHistory]);
  return <LiveResultsContext.Provider value={value}>{children}</LiveResultsContext.Provider>;
}

/** A fixed reader state in place of polling, for server-rendered tests of the results pages. */
export function LiveResultsFixture({ state, now, history = null, children }: { state: LiveClientState; now: number; history?: LiveHistory | null; children: ReactNode }) {
  const value = useMemo(() => ({ state, now, history, watchHistory: () => () => {} }), [state, now, history]);
  return <LiveResultsContext.Provider value={value}>{children}</LiveResultsContext.Provider>;
}

/** The held results and the reader's clock at the last poll, for any results page. */
export function useLiveState(): { state: LiveClientState; now: number } {
  const live = useContext(LiveResultsContext);
  if (live === null) throw new Error("useLiveState must render inside LiveResultsProvider");
  return { state: live.state, now: live.now };
}

/** The count over the night where a provider polls it, else null: for parts of the page that
 *  also render outside the live layout, as the mayor lead does in server-rendered tests. */
export function useLiveHistoryIfProvided(): LiveHistory | null {
  const live = useContext(LiveResultsContext);
  useEffect(() => live?.watchHistory(), [live]);
  return live?.history ?? null;
}

/** The count over the night, polled while the calling view is mounted. */
export function useLiveHistory(): LiveHistory | null {
  const live = useContext(LiveResultsContext);
  if (live === null) throw new Error("useLiveHistory must render inside LiveResultsProvider");
  const { history, watchHistory } = live;
  useEffect(() => watchHistory(), [watchHistory]);
  return history;
}
