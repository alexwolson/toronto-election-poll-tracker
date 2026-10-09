"use client";

import Link from "next/link";
import { ContentSection } from "@/components/content-section";
import { SectionHeading } from "@/components/section-heading";
import { useResultsLive } from "@/lib/results-clock";

/** The home page's way into the count, worded by the reader's clock (#13). */
export function ResultsHomePanel() {
  const live = useResultsLive();
  return (
    <ContentSection tint aria-labelledby="results-home-heading">
      <SectionHeading headingId="results-home-heading" title="Election night results" />
      <p className="race-hero-meta">{live ? "Live results" : "Results from 8 p.m."}</p>
      <Link href="/results" className="btn btn--ghost">
        See the results →
      </Link>
    </ContentSection>
  );
}
