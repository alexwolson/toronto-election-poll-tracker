"use client";

import { useState } from "react";
import type { PoolModel } from "@/lib/api";

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
        left: `${value * 100}%`,
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
        borderBottom: "6px solid #1a1a1a",
        opacity: 0.55,
        flexShrink: 0,
      }} />
      <span style={{
        fontFamily: "var(--font-ibm-mono), monospace",
        fontSize: "0.55rem",
        color: "#1a1a1a",
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
  bradford: "Bradford best-case",
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
  const bradfordShare = model.candidates["bradford"]?.share ?? 0;
  const uncaptured = model.uncaptured_anti_chow;

  const notSure = model.approval.not_sure;

  const { floor_polls, h2h_polls, capture_polls } = model.poll_detail;
  const chowPeak = Math.max(0, ...floor_polls.map((p) => p.chow), ...h2h_polls.map((p) => p.chow));
  const bradfordPeak = Math.max(0, ...capture_polls.map((p) => p.bradford), ...h2h_polls.map((p) => p.bradford));

  // Scenario-derived bar values
  const isCurrent = scenario === "current";
  const isChow = scenario === "chow";
  const isBradford = scenario === "bradford";

  // Chow: best-case gets ceiling + notSure; bradford best-case she gets floor only
  const chowBarTotal = isChow ? chowTotal + notSure : isBradford ? chowFloor : chowTotal;
  const chowBonus = isChow ? notSure : 0; // undecideds absorbed by Chow

  // Bradford: best-case gets all anti-Chow + notSure; chow best-case he gets base only
  const bradfordBarTotal = isBradford ? antiTotal + notSure : isChow ? bradfordShare : antiTotal;
  const bradfordBonus = isBradford ? notSure : 0; // undecideds absorbed by Bradford

  // In scenario mode, the "not engaged" row becomes "other / did not vote"
  // Chow best-case: uncaptured anti-Chow stay home
  // Bradford best-case: Chow's soft support stays home
  const didNotVote = isChow ? uncaptured : isBradford ? ppActivated + ppReserve : 0;
  const notSureDisplay = isCurrent ? notSure : didNotVote;

  const showPeakMarkers = isCurrent;

  return (
    <div className="p-6 md:p-8">
      <div className="va-title-row">
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "1rem" }}>
          <span className="font-heading" style={{ fontSize: "1.6rem", fontWeight: 700, color: "#1a1a1a" }}>
            Where Toronto voters sit
          </span>
          {/* Scenario toggles */}
          <div style={{ display: "flex", border: "1px solid #ccc", flexShrink: 0 }}>
            {(["current", "chow", "bradford"] as Scenario[]).map((s, i) => (
              <button
                key={s}
                onClick={() => setScenario(s)}
                style={{
                  fontFamily: "var(--font-ibm-mono), monospace",
                  fontSize: "0.58rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  padding: "0.35rem 0.75rem",
                  border: "none",
                  borderRight: i < 2 ? "1px solid #ccc" : "none",
                  background: scenario === s ? "#1a1a1a" : "transparent",
                  color: scenario === s ? "#fff" : "#555",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {SCENARIO_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
        <div style={{ fontFamily: "var(--font-newsreader), serif", fontSize: "0.85rem", fontStyle: "italic", color: "#555", marginTop: "0.3rem" }}>
          {isCurrent
            ? "Structural model, not a poll average"
            : `Theoretical scenario — ${scenario === "chow" ? "Chow" : "Bradford"} best-case: all voters lock in, undecideds break one way`}
        </div>
      </div>

      {/* Pro-Chow */}
      <div className="va-row">
        <div className="va-zone-label" style={{ color: "#854a90" }}>
          Olivia Chow
          <span className="va-zone-share">
            {isCurrent ? `${pct(chowTotal)} of electorate` : `${pct(chowBarTotal)} projected`}
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
                {chowBonus > 0 && (
                  <div className="va-seg" style={{ width: safeWidth(chowBonus, chowBarTotal), background: "#b89ec4" }} />
                )}
              </>
            )}
          </div>
          {showPeakMarkers && chowPeak > 0 && (
            <PeakMarker value={chowPeak} pollPct={Math.round(chowPeak * 100)} />
          )}
        </div>
        <div className="va-bar-sublabel">
          {isCurrent && `Polling baseline ${pct(chowFloor)} · May activate if race tightens ${pct(ppActivated)} · Approves but undecided ${pct(ppReserve)}`}
          {isChow && `Polling baseline ${pct(chowFloor)} · Soft support ${pct(ppActivated + ppReserve)} · Undecided voters ${pct(chowBonus)}`}
          {isBradford && `Polling baseline only — soft support stays home`}
        </div>
      </div>

      <hr className="va-separator" />

      {/* Anti-Chow / Bradford */}
      <div className="va-row">
        <div className="va-zone-label" style={{ color: "#00a2bf" }}>
          Brad Bradford
          <span className="va-zone-share">
            {isCurrent ? `${pct(antiTotal)} of electorate` : `${pct(bradfordBarTotal)} projected`}
          </span>
        </div>
        <div className="va-bar-track" style={{ marginBottom: showPeakMarkers && bradfordPeak > 0 ? "1.4rem" : undefined, background: "none" }}>
          <div className="va-bar" style={{ width: `${bradfordBarTotal * 100}%` }}>
            {isChow ? (
              <div className="va-seg va-seg-anti-committed" style={{ width: "100%" }} />
            ) : (
              <>
                <div className="va-seg va-seg-anti-committed" style={{ width: safeWidth(bradfordShare, bradfordBarTotal) }} />
                <div className="va-seg va-seg-anti-available" style={{ width: safeWidth(uncaptured,    bradfordBarTotal) }} />
                {bradfordBonus > 0 && (
                  <div className="va-seg" style={{ width: safeWidth(bradfordBonus, bradfordBarTotal), background: "#7ecfde" }} />
                )}
              </>
            )}
          </div>
          {showPeakMarkers && bradfordPeak > 0 && (
            <PeakMarker value={bradfordPeak} pollPct={Math.round(bradfordPeak * 100)} />
          )}
        </div>
        <div className="va-bar-sublabel">
          {isCurrent && `Polling baseline ${pct(bradfordShare)} · Anti-Chow voters without a candidate ${pct(uncaptured)}`}
          {isBradford && `Polling baseline ${pct(bradfordShare)} · Unaligned anti-Chow ${pct(uncaptured)} · Undecided voters ${pct(bradfordBonus)}`}
          {isChow && `Polling baseline only — unaligned anti-Chow stay home`}
        </div>
      </div>

      <hr className="va-separator va-separator--dashed" />

      {/* Not engaged / did not vote */}
      <div className="va-row">
        <div className="va-zone-label" style={{ color: "#666" }}>
          {isCurrent ? "Not yet engaged" : "Other candidate / did not vote"}
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
          <LegendItem cssClass="va-seg-anti-committed" label="Bradford polling baseline — more volatile while the challenger field remains unsettled" />
          <LegendItem cssClass="va-seg-chow-activated" label="Chow supporters who may activate if the race tightens" />
          <LegendItem cssClass="va-seg-anti-available" label="Backed an opposing candidate that has since declined to run" />
          <LegendItem cssClass="va-seg-chow-ceiling"   label="Approves of Chow but hasn't committed to voting for her" />
          <LegendItem cssClass="va-seg-disengaged"     label="No strong view on Chow yet" />
        </div>
      )}
    </div>
  );
}
