import type { PoolModel } from "@/lib/api";

function pct(v: number) {
  return `${Math.round(v * 100)}%`;
}

function safeWidth(part: number, total: number): string {
  if (total <= 0 || part <= 0) return "0%";
  return `${Math.min(100, (part / total) * 100)}%`;
}

function PeakMarker({ value, pollPct }: { value: number; pollPct: number }) {
  // value is 0–1, positions the marker along the bar track width
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
      {/* Upward-pointing triangle */}
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

function LegendItem({
  cssClass,
  label,
}: {
  cssClass: string;
  label: string;
}) {
  return (
    <div className="va-legend-item">
      <span className={`va-swatch ${cssClass}`} />
      <span>{label}</span>
    </div>
  );
}

export function VoterAlignmentBars({ model }: { model: PoolModel | null }) {
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
  const chowPeak = Math.max(
    0,
    ...floor_polls.map((p) => p.chow),
    ...h2h_polls.map((p) => p.chow),
  );
  const bradfordPeak = Math.max(
    0,
    ...capture_polls.map((p) => p.bradford),
    ...h2h_polls.map((p) => p.bradford),
  );

  return (
    <div className="p-6 md:p-8">
<div className="va-title-row">
        <span className="font-heading" style={{ fontSize: "1.6rem", fontWeight: 700, color: "#1a1a1a" }}>
          Where Toronto voters sit
        </span>
        <div style={{ fontFamily: "var(--font-newsreader), serif", fontSize: "0.85rem", fontStyle: "italic", color: "#555", marginTop: "0.3rem" }}>
          Structural model, not a poll average
        </div>
      </div>

      {/* Pro-Chow */}
      <div className="va-row">
        <div className="va-zone-label" style={{ color: "#854a90" }}>
          Olivia Chow
          <span className="va-zone-share">{pct(chowTotal)} of electorate</span>
        </div>
        <div className="va-bar-track" style={{ marginBottom: chowPeak > 0 ? "1.4rem" : undefined, background: "none" }}>
          <div className="va-bar" style={{ width: `${chowTotal * 100}%` }}>
            <div className="va-seg va-seg-chow-floor"     style={{ width: safeWidth(chowFloor,   chowTotal) }} />
            <div className="va-seg va-seg-chow-activated" style={{ width: safeWidth(ppActivated, chowTotal) }} />
            <div className="va-seg va-seg-chow-ceiling"   style={{ width: safeWidth(ppReserve,   chowTotal) }} />
          </div>
          {chowPeak > 0 && (
            <PeakMarker value={chowPeak} pollPct={Math.round(chowPeak * 100)} />
          )}
        </div>
        <div className="va-bar-sublabel">
          Polling baseline {pct(chowFloor)} · May activate if race tightens {pct(ppActivated)} · Approves but undecided {pct(ppReserve)}
        </div>
      </div>

      <hr className="va-separator" />

      {/* Anti-Chow */}
      <div className="va-row">
        <div className="va-zone-label" style={{ color: "#00a2bf" }}>
          Brad Bradford
          <span className="va-zone-share">{pct(antiTotal)} of electorate</span>
        </div>
        <div className="va-bar-track" style={{ marginBottom: bradfordPeak > 0 ? "1.4rem" : undefined, background: "none" }}>
          <div className="va-bar" style={{ width: `${antiTotal * 100}%` }}>
            <div className="va-seg va-seg-anti-committed" style={{ width: safeWidth(bradfordShare, antiTotal) }} />
            <div className="va-seg va-seg-anti-available" style={{ width: safeWidth(uncaptured, antiTotal) }} />
          </div>
          {bradfordPeak > 0 && (
            <PeakMarker value={bradfordPeak} pollPct={Math.round(bradfordPeak * 100)} />
          )}
        </div>
        <div className="va-bar-sublabel">
          Polling baseline {pct(bradfordShare)} · Anti-Chow voters without a candidate {pct(uncaptured)}
        </div>
      </div>

      <hr className="va-separator va-separator--dashed" />

      {/* Not engaged */}
      <div className="va-row">
        <div className="va-zone-label" style={{ color: "#666" }}>
          Not yet engaged
          <span className="va-zone-share">{pct(notSure)} of electorate</span>
        </div>
        <div className="va-bar-track" style={{ background: "none" }}>
          <div className="va-bar" style={{ width: `${notSure * 100}%` }}>
            <div className="va-seg va-seg-disengaged" style={{ width: "100%" }} />
          </div>
        </div>
        <div className="va-bar-sublabel">
          Voters who neither approve nor disapprove of Chow
        </div>
      </div>

      {/* Legend */}
      <div className="va-legend">
        <LegendItem cssClass="va-seg-chow-floor"     label="Chow polling baseline — consistent support across all poll types" />
        <LegendItem cssClass="va-seg-anti-committed" label="Bradford polling baseline — more volatile while the challenger field remains unsettled" />
        <LegendItem cssClass="va-seg-chow-activated" label="Chow supporters who may activate if the race tightens" />
        <LegendItem cssClass="va-seg-anti-available" label="Backed an opposing candidate that has since declined to run" />
        <LegendItem cssClass="va-seg-chow-ceiling"   label="Approves of Chow but hasn't committed to voting for her" />
        <LegendItem cssClass="va-seg-disengaged"     label="No strong view on Chow yet" />
      </div>
    </div>
  );
}
