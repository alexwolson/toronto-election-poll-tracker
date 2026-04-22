import type { PoolModel, ConsolidationTrend } from "@/lib/api";

const TREND_CONFIG: Record<ConsolidationTrend, { label: string; arrow: string; description: string }> = {
  consolidating: { label: "Consolidating", arrow: "↑", description: "Anti-Chow vote concentrating around a leading candidate" },
  stalling:      { label: "Stalling",      arrow: "→", description: "Anti-Chow consolidation has not advanced recently" },
  reversing:     { label: "Fragmenting",   arrow: "↓", description: "Anti-Chow vote becoming more dispersed" },
  insufficient_data: { label: "Insufficient data", arrow: "–", description: "Too few polls to assess consolidation direction" },
};

function pct(v: number) {
  return `${Math.round(v * 100)}%`;
}

function PoolBar({ pool, candidates, uncaptured }: {
  pool: PoolModel["pool"];
  candidates: PoolModel["candidates"];
  uncaptured: number;
}) {
  const segments = [
    { key: "chow_floor",    label: "Chow (durable)",                      value: pool.chow_floor,                       color: "var(--chart-2)" },
    { key: "pp_activated",  label: "Protective progressives (activated)",  value: pool.protective_progressive_activated, color: "color-mix(in oklch, var(--chart-2) 55%, transparent)" },
    { key: "pp_reserve",    label: "Protective progressives (reserve)",    value: pool.protective_progressive_reserve,   color: "color-mix(in oklch, var(--chart-2) 25%, var(--border))" },
    { key: "bradford",      label: "Bradford",                             value: candidates["bradford"]?.share ?? 0,   color: "oklch(0.58 0.2 28)" },
    { key: "furey",         label: "Furey",                                value: candidates["furey"]?.share ?? 0,      color: "oklch(0.66 0.15 50)" },
    { key: "uncaptured",    label: "Uncaptured anti-Chow",                 value: uncaptured,                           color: "var(--muted)" },
  ].filter((s) => s.value > 0.005);

  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;

  return (
    <div className="mt-4 space-y-2">
      <div className="flex h-5 w-full overflow-hidden rounded-full border border-[var(--line-soft)]">
        {segments.map((seg) => (
          <div
            key={seg.key}
            title={`${seg.label}: ${pct(seg.value)}`}
            style={{ width: `${(seg.value / total) * 100}%`, background: seg.color }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {segments.map((seg) => (
          <span key={seg.key} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full border border-[var(--line-soft)]" style={{ background: seg.color }} />
            {seg.label} <span className="font-mono">{pct(seg.value)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function MayoralPoolDisplay({ model }: { model: PoolModel | null }) {
  if (!model) {
    return (
      <div className="surface-panel p-6 md:p-8">
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">Mayoral Race</p>
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const trend = TREND_CONFIG[model.consolidation_trend];
  const { pool, candidates, uncaptured_anti_chow } = model;

  return (
    <div className="surface-panel p-6 md:p-8 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
            Mayoral Race — Voter Preference
          </p>
          <p className="mt-1 text-xs text-muted-foreground italic">
            Pre-nomination · field not yet set · nominations close Aug 21
          </p>
        </div>
        <div className="flex-shrink-0 flex flex-col items-center rounded-xl border border-[var(--line-soft)] px-3 py-2 text-center bg-[color:var(--secondary)]">
          <span className="text-lg leading-none text-muted-foreground">{trend.arrow}</span>
          <span className="mt-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">{trend.label}</span>
        </div>
      </div>

      <PoolBar pool={pool} candidates={candidates} uncaptured={uncaptured_anti_chow} />

      <div className="h-px bg-[var(--line-soft)]" />

      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">Chow floor</p>
          <p className="mt-0.5 text-xl font-semibold">{pct(pool.chow_floor)}</p>
          <p className="text-xs text-muted-foreground">durable support</p>
        </div>
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">Anti-Chow pool</p>
          <p className="mt-0.5 text-xl font-semibold">{pct(pool.anti_chow_pool)}</p>
          <p className="text-xs text-muted-foreground">current disapproval</p>
        </div>
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">Bradford capture</p>
          <p className="mt-0.5 text-xl font-semibold">{pct(candidates["bradford"]?.capture_rate ?? 0)}</p>
          <p className="text-xs text-muted-foreground">of anti-Chow pool</p>
        </div>
        {pool.chow_h2h_current !== null && (
          <div>
            <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">Chow vs Bradford</p>
            <p className="mt-0.5 text-xl font-semibold">{pct(pool.chow_h2h_current)}</p>
            <p className="text-xs text-muted-foreground">Chow head-to-head</p>
          </div>
        )}
      </div>

      <div className="h-px bg-[var(--line-soft)]" />

      <p className="text-xs text-muted-foreground leading-relaxed">
        {model.phase_mode_context} Floor from {model.data_notes.full_field_poll_count} full-field polls; approval anchors from {model.data_notes.approval_data_points} Liaison Strategies surveys.
      </p>
    </div>
  );
}
