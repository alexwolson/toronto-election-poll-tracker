/**
 * PROTOTYPE (throwaway): the homepage's "What the latest poll found" section,
 * copied from src/app/page.tsx with a slot for each variant's head-to-head
 * treatment.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { ContentSection } from "@/components/content-section";
import { PollingScopeNote } from "@/components/polling-scope-note";
import { PollsterLink } from "@/components/pollster-link";
import { SectionHeading } from "@/components/section-heading";
import { candidateMeta, candidateName } from "@/lib/candidates";
import { formatDate, formatSharePct } from "@/lib/format";
import {
  denominatorPhrase,
  latestFieldShares,
  latestPoll,
  pollMethodLabel,
  residualShares,
} from "@/lib/polling";
import type { MayoralPollingFeed } from "@/types/feeds";

export function LatestPoll({
  polling,
  field,
  extra,
}: {
  polling: MayoralPollingFeed;
  field: string[];
  extra?: ReactNode;
}) {
  const shares = latestFieldShares(polling, field);
  const ranked = field.filter((id) => id in shares).sort((a, b) => shares[b] - shares[a]);
  const latest = latestPoll(polling);
  if (!latest || ranked.length === 0) return null;
  const residual = residualShares(latest, field);
  const denominator = denominatorPhrase(latest);
  return (
    <ContentSection tint className="polling-takeaway" aria-labelledby="poll-snapshot-heading">
      <SectionHeading headingId="poll-snapshot-heading" title="What the latest poll found">
        <PollingScopeNote />
      </SectionHeading>
      <p className="poll-snapshot-line" aria-label="Latest poll shares">
        <PollsterLink firm={latest.firm} />, {formatDate(latest.date_conducted)}
        {latest.sample_size ? `, ${latest.sample_size.toLocaleString()} respondents` : ""} by{" "}
        {pollMethodLabel(latest.methodology).replace(/^./, (c) => c.toLowerCase())}
        {denominator ? `, ${denominator}` : ""}:{" "}
        {ranked.map((id, index) => {
          const meta = candidateMeta(id);
          return (
            <span key={id}>
              {index > 0 && ", "}
              <strong className="poll-snapshot__candidate">
                <span className={`candidate-marker candidate-marker--${meta.slug}`} aria-hidden="true" />
                {candidateName(id)} {formatSharePct(shares[id])}
              </strong>
            </span>
          );
        })}
        {residual.undecided !== null && <span>, undecided {formatSharePct(residual.undecided)}</span>}
        {residual.other !== null && <span>, other reported choices {formatSharePct(residual.other)}</span>}.
      </p>
      {extra}
      <Link href="/polls" className="btn btn--primary">
        See all mayoral polls and the trend →
      </Link>
    </ContentSection>
  );
}
