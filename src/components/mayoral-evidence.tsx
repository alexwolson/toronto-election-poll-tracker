"use client";

import { useState } from "react";
import type { ApprovalSlice, EvidenceSlice, MayoralRace } from "@/lib/mayoral-api";
import { CANDIDATE_NAMES } from "@/lib/candidate-presentation";

type Lens = "current" | "head_to_head" | "approval";

const LABELS: Record<string, string> = {
  ...CANDIDATE_NAMES,
  residual: "Other / undecided",
};

const LENSES: { id: Lens; label: string }[] = [
  { id: "current", label: "Current field" },
  { id: "head_to_head", label: "Head-to-head" },
  { id: "approval", label: "Approval" },
];

function pct(value: number | null | undefined, digits = 0) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${(value * 100).toFixed(digits)}%`
    : "Unavailable";
}

function EvidenceBar({ slice }: { slice: EvidenceSlice }) {
  const entries = [
    ...Object.entries(slice.candidates),
    ["residual", slice.residual.share] as const,
  ].filter((entry): entry is [string, number] => typeof entry[1] === "number");
  return (
    <div className="evidence-stack" aria-hidden="true">
      {entries.map(([id, share]) => (
        <span
          key={id}
          className={`evidence-stack-segment evidence-stack-segment--${id}`}
          style={{ width: `${share * 100}%` }}
          title={`${LABELS[id] ?? id}: ${pct(share, 1)}`}
        />
      ))}
    </div>
  );
}

function EvidenceTable({ slice }: { slice: EvidenceSlice }) {
  const entries = [
    ...Object.entries(slice.candidates),
    ["residual", slice.residual.share] as const,
  ];
  return (
    <table className="evidence-table">
      <caption>Poll-reported vote intention</caption>
      <thead><tr><th>Response</th><th>Share</th></tr></thead>
      <tbody>
        {entries.map(([id, share]) => (
          <tr key={id}>
            <th scope="row"><span className={`candidate-marker candidate-marker--${id}`} aria-hidden="true" />{LABELS[id] ?? id}</th>
            <td>{pct(share, 1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ApprovalView({ approval }: { approval: ApprovalSlice }) {
  if (approval.availability !== "available") return <p className="empty-state">Approval evidence is unavailable.</p>;
  const rows = [
    ["Approve", approval.approve, "approve"],
    ["Disapprove", approval.disapprove, "disapprove"],
    ["Unsure / unreported", (approval.not_sure ?? 0) + (approval.unreported ?? 0), "unsure"],
  ] as const;
  return (
    <>
      <p className="evidence-explainer"><strong>This is not vote intention.</strong> Approval asks how voters view Olivia Chow; it does not say which candidate they will support.</p>
      <div className="evidence-stack evidence-stack--approval" aria-hidden="true">
        {rows.map(([label, share, id]) => typeof share === "number" && (
          <span key={id} className={`evidence-stack-segment evidence-stack-segment--${id}`} style={{ width: `${share * 100}%` }} title={`${label}: ${pct(share, 1)}`} />
        ))}
      </div>
      <table className="evidence-table">
        <caption>Views of Olivia Chow</caption>
        <thead><tr><th>Response</th><th>Share</th></tr></thead>
        <tbody>{rows.map(([label, share]) => <tr key={label}><th scope="row">{label}</th><td>{pct(share, 1)}</td></tr>)}</tbody>
      </table>
      <p className="evidence-meta font-mono">{approval.reading_count} tracked readings · effective recent count {approval.effective_reading_count.toFixed(1)} · {approval.firm_count} {approval.firm_count === 1 ? "firm" : "firms"}</p>
    </>
  );
}

export function MayoralEvidence({ race }: { race: MayoralRace }) {
  const [lens, setLens] = useState<Lens>("current");
  const slice = lens === "current" ? race.current_field : race.head_to_head;
  return (
    <div className="evidence-module">
      <p className="evidence-instruction" id="evidence-instruction">Choose the evidence you want to compare.</p>
      <div className="evidence-lenses" role="group" aria-labelledby="evidence-instruction">
        {LENSES.map((item) => (
          <button key={item.id} type="button" aria-pressed={lens === item.id} onClick={() => setLens(item.id)}>{item.label}</button>
        ))}
      </div>

      {lens === "approval" ? <ApprovalView approval={race.approval} /> : slice.availability === "available" ? (
        <>
          <p className="evidence-explainer">
            {lens === "current"
              ? "Only polls offering Chow, Bradford, and Alexander are combined here."
              : "This lens reports only polls that offered a Bradford–Chow head-to-head ballot."}
          </p>
          <EvidenceBar slice={slice} />
          <EvidenceTable slice={slice} />
          <p className="evidence-meta font-mono">Poll-reported vote intention · {slice.poll_count} {slice.poll_count === 1 ? "poll" : "polls"} · {slice.firm_count} {slice.firm_count === 1 ? "firm" : "firms"}</p>
          {lens === "current" && race.challenger_lane.availability === "available" && (
            <div className="lane-split">
              <div><strong>Bradford–Alexander split</strong><span>Share of combined Bradford–Alexander support</span></div>
              <div className="lane-split-values">
                <span className="lane-split-bradford">Bradford {pct(race.challenger_lane.named_split.bradford)}</span>
                <span className="lane-split-alexander">Alexander {pct(race.challenger_lane.named_split.alexander)}</span>
              </div>
              <p>{race.challenger_lane.trend.status === "insufficient_data" ? race.challenger_lane.trend.reason : `Directional signal: ${race.challenger_lane.trend.status}.`}</p>
            </div>
          )}
        </>
      ) : <p className="empty-state">This evidence lens is unavailable.</p>}
    </div>
  );
}
