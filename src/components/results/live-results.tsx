"use client";

/**
 * The browser side of the live page (#17 § Browser): polls `/live/results.json`
 * every 60 s on the same origin, so readers on the production domain never touch
 * `*.vercel.app` (research 05 §6), and applies each poll through the pure accept
 * rule.
 */

import { useEffect, useReducer, useState } from "react";
import { acceptPoll, INITIAL_LIVE_STATE } from "@/lib/live-accept";
import { LiveResultsView } from "./live-results-view";

const LIVE_URL = "/live/results.json";
const POLL_INTERVAL_MS = 60_000;

/** The parsed body, or null for any network, status or JSON failure. */
async function fetchLive(): Promise<unknown> {
  try {
    // Skip the browser's HTTP cache; the CDN's ISR copy is what collapses load.
    const response = await fetch(LIVE_URL, { cache: "no-store" });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

export function LiveResults() {
  const [state, apply] = useReducer(acceptPoll, INITIAL_LIVE_STATE);
  // The reader's clock at the last poll, for the staleness banner.
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

  return <LiveResultsView state={state} now={now} />;
}
