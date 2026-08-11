"use client";

import { useState } from "react";
import type { PoolModel } from "@/lib/api";
import { getCandidateColor, getCandidateName } from "@/lib/pool-candidates";

type Scenario = "current" | "chow" | "bradford";

function pct(v: number) {
  return `${Math.round(v * 100)}%`;
}

function safeWidth(part: number, total: number): string {
  if (total <= 0 || part <= 0) return "0%";
  return `${Math.min(100, (part / total) * 100)}%`;
}

function PeakMarker({ value, pollPct }: { value: number; pollPct: number }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: -20,
        left: `${Math.min(82, value * 100)}%`,
        display: "flex",
        alignItems: "center",
        gap: "4px",
        pointerEvents: "none",
        whiteSpace: "nowrap",
      }}
    >
      <div style={{
        width: 0,
        height: 0,
        borderLeft: "4px solid transparent",
        borderRight: "4px solid transparent",
        borderBottom: "6px solid var(--text-strong)",
        opacity: 0.55,
        flexShrink: 0,
      }} />
      <span className="font-mono" style={{
        fontSize: "0.55rem",
        color: "var(--text-strong)",
        opacity: 0.65,
      }}>
        best poll {pollPct}%
      </span>
    </div>
  );
}

function LegendItem({ cssClass, label }: { cssClass: string; label: string }) {
  return (
    <div className="va-legend-item">
      <span className={`va-swatch ${cssClass}`} />
      <span>{label}</span>
    </div>
  );
}

const SCENARIO_LABELS: Record<Scenario, string> = {
  current: "Current",
  chow: "Chow best-case",
  bradford: "Bradford consolidates",
};

export function VoterAlignmentBars({ model }: { model: PoolModel | null }) {
  const [scenario, setScenario] = useState<Scenario>("current");

  if (!model) {
    return (
      <div className="p-6 md:p-8">
        <p className="np-kicker">Mayoral Race</p>
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const chowFloor = model.pool.chow_floor;
  const chowTotal = model.pool.chow_ceiling;
  const ppActivated = model.pool.protective_progressive_activated;
  const ppReserve = model.pool.protective_progressive_reserve;

  const antiTotal = model.pool.anti_chow_pool;
  const uncaptured = model.uncaptured_anti_chow;
  const challengerSegments = Object.entries(model.candidates)
    .filter(([, candidate]) => candidate.share > 0)
    .sort(([, a], [, b]) => b.share - a.share);
  const challengerBase = challengerSegments.reduce(
    (sum, [, candidate]) => sum + candidate.share,
    0
  );

  const notSure = model.approval.not_sure;

  const { floor_polls, h2h_polls, capture_polls } = model.poll_detail;
  const chowPeak = Math.max(0, ...floor_polls.map((p) => p.chow), ...h2h_polls.map((p) => p.chow));
  const bradfordPeak = Math.max(
    0,
    ...(capture_polls["bradford"] ?? []).map((p) => p.share),
    ...h2h_polls.map((p) => p.bradford)
  );

  // Scenario-derived bar values
  const isCurrent = scenario === "current";
  const isChow = scenario === "chow";
  const isBradford = scenario === "bradford";

  // Ceiling is 1 − disapprove, so the not-sure bloc is already inside
  // ppReserve; the approve-only part of the reserve is what stays home in
  // Bradford's best case (his bonus absorbs the not-sures).
  const approveReserve = Math.max(0, ppReserve - notSure);

  // Chow: best-case gets her full ceiling (approve + not sure); bradford best-case she gets floor only
  const chowBarTotal = isBradford ? chowFloor : chowTotal;

  // Bradford: best-case gets all anti-Chow + notSure; chow best-case he gets base only
  const bradfordBarTotal = isBradford
    ? antiTotal + notSure
    : isChow
      ? challengerBase
      : antiTotal;
  const bradfordBonus = isBradford ? notSure : 0; // undecideds absorbed by Bradford

  // In scenario mode, the "not engaged" row becomes "other / did not vote"
  // Chow best-case: uncaptured anti-Chow stay home
  // Bradford best-case: Chow's soft support stays home (not-sures went to him)
  const didNotVote = isChow ? uncaptured : isBradford ? ppActivated + approveReserve : 0;
  const notSureDisplay = isCurrent ? notSure : didNotVote;

  const showPeakMarkers = isCurrent;

  return (
    <div className="p-6 md:p-8">
      <div className="va-title-row">
        <div className="va-heading-row">
          <span className="font-heading va-heading">
            Structural support ranges
          </span>
          <div className="va-scenario-group">
            <span className="font-mono va-scenario-instruction">Choose a scenario</span>
            <div className="va-scenario-controls" aria-label="Choose a model scenario">
            {(["current", "chow", "bradford"] as Scenario[]).map((s, i) => (
              <button
                key={s}
                onClick={() => setScenario(s)}
                aria-pressed={scenario === s}
                className="font-mono"
                style={{
                  fontSize: "0.58rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  padding: "0.35rem 0.6rem",
                  border: "none",
                  borderRight: i < 2 ? "1px solid var(--line-soft)" : "none",
                  background: scenario === s ? "var(--text-strong)" : "transparent",
                  color: scenario === s ? "#fff" : "var(--text-mid)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {SCENARIO_LABELS[s]}
              </button>
            ))}
            </div>
          </div>
        </div>
        <div className="font-heading" style={{ fontSize: "0.85rem", fontStyle: "italic", color: "var(--text-mid)", marginTop: "0.3rem" }}>
          {isCurrent
            ? "Structural model, not a poll average"
            : scenario === "chow"
              ? "Theoretical Chow best-case — soft supporters activate while remaining opposition stays home"
              : "Theoretical Bradford consolidation — he absorbs the challenger lane and undecided voters"}
        </div>
      </div>

      {/* Pro-Chow */}
      <div className="va-row">
        <div className="va-zone-label" style={{ color: "var(--color-chow)" }}>
          Chow polling baseline
          <span className="va-zone-share">
            {isCurrent ? `${pct(chowFloor)} current · ${pct(chowTotal)} ceiling` : `${pct(chowBarTotal)} scenario`}
          </span>
        </div>
        <div className="va-bar-track" style={{ marginBottom: showPeakMarkers && chowPeak > 0 ? "1.4rem" : undefined, background: "none" }}>
          <div className="va-bar" style={{ width: `${chowBarTotal * 100}%` }}>
            {isBradford ? (
              <div className="va-seg va-seg-chow-floor" style={{ width: "100%" }} />
            ) : (
              <>
                <div className="va-seg va-seg-chow-floor"     style={{ width: safeWidth(chowFloor,   chowBarTotal) }} />
                <div className="va-seg va-seg-chow-activated" style={{ width: safeWidth(ppActivated, chowBarTotal) }} />
                <div className="va-seg va-seg-chow-ceiling"   style={{ width: safeWidth(ppReserve,   chowBarTotal) }} />
              </>
            )}
          </div>
          {showPeakMarkers && chowPeak > 0 && (
            <PeakMarker value={chowPeak} pollPct={Math.round(chowPeak * 100)} />
          )}
        </div>
        <div className="va-bar-sublabel">
          {isCurrent && `Modelled support range ${pct(chowFloor)}–${pct(chowTotal)} · Potential activation ${pct(ppActivated)} · Reserve ${pct(ppReserve)}`}
          {isChow && `Polling baseline ${pct(chowFloor)} · Soft support and undecideds ${pct(ppActivated + ppReserve)}`}
          {isBradford && `Polling baseline only — soft support stays home`}
        </div>
      </div>

      <hr className="va-separator" />

      {/* Anti-Chow challenger lane */}
      <div className="va-row">
        <div className="va-zone-label" style={{ color: "var(--text-strong)" }}>
          Challenger opportunity
          <span className="va-zone-share">
            {isCurrent
              ? `${pct(antiTotal)} structural maximum`
              : `${pct(bradfordBarTotal)} scenario`}
          </span>
        </div>
        <div className="va-bar-track" style={{ marginBottom: showPeakMarkers && bradfordPeak > 0 ? "1.4rem" : undefined, background: "none" }}>
          <div className="va-bar" style={{ width: `${bradfordBarTotal * 100}%` }}>
            {isChow ? (
              <div className="va-seg va-seg-anti-committed" style={{ width: "100%" }} />
            ) : isCurrent ? (
              <>
                {challengerSegments.map(([slug, candidate]) => (
                  <div
                    key={slug}
                    className="va-seg"
                    title={`${getCandidateName(slug)}: ${pct(candidate.share)} of electorate; ${pct(candidate.polling_share ?? candidate.share)} in current-field polling`}
                    style={{
                      width: safeWidth(candidate.share, bradfordBarTotal),
                      background: getCandidateColor(slug),
                      backgroundImage: slug === "alexander" ? "repeating-linear-gradient(135deg, transparent 0 7px, rgba(58, 37, 0, 0.35) 7px 9px)" : undefined,
                      boxShadow: slug === "alexander" ? "inset 0 0 0 1px #5B4000" : undefined,
                    }}
                  />
                ))}
                <div
                  className="va-seg va-seg-anti-available"
                  style={{ width: safeWidth(uncaptured, bradfordBarTotal) }}
                />
              </>
            ) : (
              <>
                <div className="va-seg va-seg-anti-committed" style={{ width: safeWidth(antiTotal, bradfordBarTotal) }} />
                {bradfordBonus > 0 && (
                  <div className="va-seg" style={{ width: safeWidth(bradfordBonus, bradfordBarTotal), background: "var(--color-bradford-soft)" }} />
                )}
              </>
            )}
          </div>
          {showPeakMarkers && bradfordPeak > 0 && (
            <PeakMarker value={bradfordPeak} pollPct={Math.round(bradfordPeak * 100)} />
          )}
        </div>
        <div className="va-bar-sublabel">
          {isCurrent && `Candidate allocation: ${challengerSegments
            .map(([slug, candidate]) => `${getCandidateName(slug)} polling ${pct(candidate.polling_share ?? candidate.share)}`)
            .join(" · ")} · Other/uncommitted opposition ${pct(uncaptured)}`}
          {isBradford && `All modelled anti-Chow opportunity ${pct(antiTotal)} · Undecided voters ${pct(bradfordBonus)}`}
          {isChow && `Current challenger baselines only — remaining anti-Chow voters stay home`}
        </div>
      </div>

      <hr className="va-separator va-separator--dashed" />

      {/* Not engaged / did not vote */}
      <div className="va-row">
        <div className="va-zone-label" style={{ color: "var(--text-soft)" }}>
          {isCurrent ? "Not yet committed" : "Other candidate / did not vote"}
          <span className="va-zone-share">{pct(notSureDisplay)} of electorate</span>
        </div>
        <div className="va-bar-track" style={{ background: "none" }}>
          <div className="va-bar" style={{ width: `${notSureDisplay * 100}%` }}>
            <div className="va-seg va-seg-disengaged" style={{ width: "100%" }} />
          </div>
        </div>
        <div className="va-bar-sublabel">
          {isCurrent && "Voters who neither approve nor disapprove of Chow"}
        </div>
      </div>

      {/* Legend */}
      {isCurrent && (
        <div className="va-legend">
          <LegendItem cssClass="va-seg-chow-floor"     label="Chow polling baseline — consistent support across all poll types" />
          {challengerSegments.map(([slug, candidate]) => (
            <div className="va-legend-item" key={slug}>
              <span
                className={`va-swatch ${slug === "alexander" ? "va-swatch--alexander" : ""}`}
                style={{ backgroundColor: getCandidateColor(slug) }}
              />
              <span>
                {getCandidateName(slug)} — {pct(candidate.capture_rate)} of the
                modelled anti-Chow opportunity; {pct(candidate.lane_share ?? 0)} of combined Bradford–Alexander support
              </span>
            </div>
          ))}
          <LegendItem cssClass="va-seg-chow-activated" label="Chow supporters who may activate if the race tightens" />
          {uncaptured > 0 && (
            <LegendItem cssClass="va-seg-anti-available" label="Anti-Chow voters not yet allocated to a tracked challenger" />
          )}
          <LegendItem cssClass="va-seg-chow-ceiling"   label="Open to Chow — approves or unsure, but hasn't committed to voting for her" />
          <LegendItem cssClass="va-seg-disengaged"     label="No strong view on Chow yet" />
        </div>
      )}
    </div>
  );
}
