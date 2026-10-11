"use client";

import Link from "next/link";
import { ContentSection } from "@/components/content-section";
import { SectionHeading } from "@/components/section-heading";
import { type ResultsPhase, useResultsPhase } from "@/lib/results-clock";

const STATUS: Record<ResultsPhase, string> = {
  before: "Results from 8 p.m.",
  live: "Live results",
  unofficial: "Unofficial results",
};

/** The home page's way into the count, worded by the reader's clock (#13, #54). */
export function ResultsHomePanel() {
  const phase = useResultsPhase();
  return (
    <ContentSection tint aria-labelledby="results-home-heading">
      <SectionHeading headingId="results-home-heading" title="Election night results" />
      <p className="race-hero-meta">{STATUS[phase]}</p>
      <Link href="/results" className="btn btn--ghost">
        See the results →
      </Link>
    </ContentSection>
  );
}
