import type { PoolModel } from "@/lib/api";

function pct(v: number) {
  return `${Math.round(v * 100)}%`;
}

function safeWidth(part: number, total: number): string {
  if (total <= 0 || part <= 0) return "0%";
  return `${Math.min(100, (part / total) * 100)}%`;
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

  return (
    <div className="p-6 md:p-8">
      <p className="np-kicker" style={{ color: "#c53030", marginBottom: "4px" }}>
        Mayoral Race · Voter Alignment · Pre-nomination
      </p>

      <div className="va-title-row">
        <span className="font-heading" style={{ fontSize: "1.6rem", fontWeight: 700, color: "#1a1a1a" }}>
          Where Toronto voters sit
        </span>
      </div>

      {/* Pro-Chow */}
      <div className="va-row">
        <div className="va-zone-label" style={{ color: "#854a90" }}>
          Olivia Chow
          <span className="va-zone-share">{pct(chowTotal)} of electorate</span>
        </div>
        <div className="va-bar-track">
          <div className="va-bar" style={{ width: `${chowTotal * 100}%` }}>
            <div className="va-seg va-seg-chow-floor"     style={{ width: safeWidth(chowFloor,   chowTotal) }} />
            <div className="va-seg va-seg-chow-activated" style={{ width: safeWidth(ppActivated, chowTotal) }} />
            <div className="va-seg va-seg-chow-ceiling"   style={{ width: safeWidth(ppReserve,   chowTotal) }} />
          </div>
          <div className="va-fifty-line" />
        </div>
        <div className="va-bar-sublabel">
          Floor {pct(chowFloor)} · Protective {pct(ppActivated)} · Approves, uncommitted {pct(ppReserve)}
        </div>
      </div>

      <hr className="va-separator" />

      {/* Anti-Chow */}
      <div className="va-row">
        <div className="va-zone-label" style={{ color: "#00a2bf" }}>
          Brad Bradford
          <span className="va-zone-share">{pct(antiTotal)} of electorate</span>
        </div>
        <div className="va-bar-track">
          <div className="va-bar" style={{ width: `${antiTotal * 100}%` }}>
            <div className="va-seg va-seg-anti-committed" style={{ width: safeWidth(bradfordShare, antiTotal) }} />
            <div className="va-seg va-seg-anti-available" style={{ width: safeWidth(uncaptured, antiTotal) }} />
          </div>
          <div className="va-fifty-line" />
        </div>
        <div className="va-bar-sublabel">
          Committed {pct(bradfordShare)} · Available {pct(uncaptured)}
        </div>
      </div>

      <hr className="va-separator va-separator--dashed" />

      {/* Not engaged */}
      <div className="va-row">
        <div className="va-zone-label" style={{ color: "#666" }}>
          Not yet engaged
          <span className="va-zone-share">{pct(notSure)} of electorate</span>
        </div>
        <div className="va-bar-track">
          <div className="va-bar" style={{ width: `${notSure * 100}%` }}>
            <div className="va-seg va-seg-disengaged" style={{ width: "100%" }} />
          </div>
          <div className="va-fifty-line" />
        </div>
        <div className="va-bar-sublabel">
          Hasn&apos;t formed a strong view — how they break depends on the campaign
        </div>
      </div>

      {/* Legend */}
      <div className="va-legend">
        <LegendItem cssClass="va-seg-chow-floor"     label="Chow floor — votes Chow regardless of field" />
        <LegendItem cssClass="va-seg-anti-committed" label="Behind Bradford" />
        <LegendItem cssClass="va-seg-chow-activated" label="Protective Chow voters — activate to block a viable challenger" />
        <LegendItem cssClass="va-seg-anti-available" label="Opposes Chow; no challenger picked" />
        <LegendItem cssClass="va-seg-chow-ceiling"   label="Approves of Chow — not yet committing" />
        <LegendItem cssClass="va-seg-disengaged" label="Not yet engaged" />
      </div>
    </div>
  );
}
