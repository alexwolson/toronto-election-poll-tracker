"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isResultsPath } from "@/lib/race-links";
import { type ResultsPhase, useResultsPhase } from "@/lib/results-clock";

const COPY: Record<ResultsPhase, { flag: string; text: string; cta: string }> = {
  before: {
    flag: "Election day",
    text: "Toronto votes Monday, Oct 26. Results from 8 p.m.",
    cta: "See the results page →",
  },
  live: { flag: "Live results", text: "The count is under way.", cta: "Follow the count →" },
  unofficial: { flag: "Results", text: "Unofficial results are in.", cta: "See the results →" },
};

/**
 * CHW's announcement banner, above the masthead on every page but the results
 * themselves: the way into the count, worded by the reader's clock (#13, #54).
 * It has no dismiss control, so it carries no state.
 */
export function ElectionBanner() {
  const pathname = usePathname();
  const phase = useResultsPhase();
  if (pathname && isResultsPath(pathname)) return null;
  const { flag, text, cta } = COPY[phase];
  return (
    <div className="banner" role="region" aria-label="Election announcement">
      <div className="wrap banner__inner">
        <Link className="banner__link" href="/results">
          <span className="banner__flag">{flag}</span>
          <span className="banner__text">{text}</span>
          <span className="banner__cta">{cta}</span>
        </Link>
      </div>
    </div>
  );
}
