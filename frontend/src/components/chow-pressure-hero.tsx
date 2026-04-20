import type { ChowPressure, ChowPressureBand, ChowPressureTrend } from "@/lib/api";

const BAND_CONFIG: Record<
  ChowPressureBand,
  { label: string; color: string; bg: string; fill: string }
> = {
  low: {
    label: "Low",
    color: "var(--chart-2)",
    bg: "color-mix(in oklch, var(--chart-2) 10%, transparent)",
    fill: "oklch(0.52 0.1 247)",
  },
  moderate: {
    label: "Moderate",
    color: "var(--chart-1)",
    bg: "color-mix(in oklch, var(--chart-1) 12%, transparent)",
    fill: "oklch(0.66 0.11 77)",
  },
  elevated: {
    label: "Elevated",
    color: "var(--destructive)",
    bg: "color-mix(in oklch, var(--destructive) 10%, transparent)",
    fill: "oklch(0.58 0.2 28)",
  },
};

const TREND_CONFIG: Record<
  ChowPressureTrend,
  { label: string; arrow: string; subtitle: string }
> = {
  rising: {
    label: "Rising",
    arrow: "↑",
    subtitle: "Pressure increasing in recent polls",
  },
  easing: {
    label: "Easing",
    arrow: "↓",
    subtitle: "Pressure receding in recent polls",
  },
  flat: {
    label: "Stable",
    arrow: "→",
    subtitle: "No significant directional shift",
  },
  insufficient: {
    label: "Insufficient data",
    arrow: "–",
    subtitle: "Too few polls to compute trend",
  },
};

/** Semicircular arc gauge from 0% to 100% left→right */
function PressureGauge({
  value,
  band,
}: {
  value: number;
  band: ChowPressureBand;
}) {
  const cfg = BAND_CONFIG[band];
  const clampedValue = Math.max(0, Math.min(1, value));

  // SVG arc: half-circle, r=44, cx=56 cy=56
  const R = 44;
  const CX = 56;
  const CY = 58;
  const circumference = Math.PI * R; // half circle arc length

  // stroke-dashoffset trick on a path
  const arcLen = Math.PI * R;
  const offset = arcLen * (1 - clampedValue);
  const percent = Math.round(clampedValue * 100);

  // Needle tip coordinates (angle 0=left, π=right, mapped to value 0→1)
  const angle = Math.PI * clampedValue; // 0 at left, π at right
  const needleX = CX - R * Math.cos(angle);
  const needleY = CY - R * Math.sin(angle);

  return (
    <svg
      viewBox="0 0 112 68"
      className="w-full max-w-[200px]"
      aria-label={`Chow Pressure gauge: ${percent}%`}
    >
      {/* Track */}
      <path
        d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
        fill="none"
        stroke="var(--border)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      {/* Filled arc */}
      <path
        d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
        fill="none"
        stroke={cfg.fill}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${arcLen}`}
        strokeDashoffset={`${offset}`}
        style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }}
      />
      {/* Needle */}
      <line
        x1={CX}
        y1={CY}
        x2={needleX}
        y2={needleY}
        stroke={cfg.fill}
        strokeWidth="2"
        strokeLinecap="round"
        style={{ transition: "x2 0.8s cubic-bezier(0.4,0,0.2,1), y2 0.8s cubic-bezier(0.4,0,0.2,1)" }}
      />
      {/* Centre dot */}
      <circle cx={CX} cy={CY} r="3.5" fill={cfg.fill} />
      {/* Pct label */}
      <text
        x={CX}
        y={CY + 14}
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fill="currentColor"
        style={{ fontFamily: "var(--font-ibm-mono), monospace" }}
      >
        {percent}%
      </text>
      {/* Scale labels */}
      <text x="8" y={CY + 10} fontSize="7" fill="var(--muted-foreground)" textAnchor="middle">0</text>
      <text x={CX} y="11" fontSize="7" fill="var(--muted-foreground)" textAnchor="middle">50</text>
      <text x="104" y={CY + 10} fontSize="7" fill="var(--muted-foreground)" textAnchor="middle">100</text>
    </svg>
  );
}

export function ChowPressureHero({ pressure }: { pressure: ChowPressure | null }) {
  if (!pressure) {
    return (
      <div className="surface-panel p-6 md:p-8">
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
          Chow Pressure Index
        </p>
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const band = BAND_CONFIG[pressure.band];
  const trend = TREND_CONFIG[pressure.trend];
  const pct = Math.round(pressure.value * 100);

  return (
    <div
      className="surface-panel relative overflow-hidden p-6 md:p-8"
      style={{ borderColor: `color-mix(in oklch, ${band.color} 30%, var(--line-soft))` }}
    >
      {/* Subtle tinted glow in corner */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full blur-3xl"
        style={{ background: band.bg, opacity: 0.8 }}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
              Chow Pressure Index
            </p>
            <p className="mt-2 text-3xl font-heading leading-none" style={{ color: band.color }}>
              {band.label}
            </p>
          </div>
          {/* Trend badge */}
          <div
            className="flex-shrink-0 flex flex-col items-center rounded-xl border px-3 py-2 text-center"
            style={{
              borderColor: `color-mix(in oklch, ${band.color} 25%, var(--line-soft))`,
              background: band.bg,
            }}
          >
            <span className="text-xl leading-none" style={{ color: band.color }}>
              {trend.arrow}
            </span>
            <span
              className="mt-0.5 font-mono text-[0.6rem] uppercase tracking-wider"
              style={{ color: band.color }}
            >
              {trend.label}
            </span>
          </div>
        </div>

        {/* Gauge */}
        <div className="mt-4 flex justify-center">
          <PressureGauge value={pressure.value} band={pressure.band} />
        </div>

        {/* Trend subtitle */}
        <p className="mt-1 text-center text-xs text-muted-foreground">{trend.subtitle}</p>

        <div className="mt-4 h-px bg-[var(--line-soft)]" />

        {/* Methodology note */}
        <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
          Fragmentation-adjusted anti-Chow demand, exponentially weighted across{" "}
          <span className="font-mono">{pressure.diagnostics.adaptive_half_life_days.toFixed(0)}d</span>{" "}
          half-life.{" "}
          <span className="font-mono">{pct}%</span> of the vote is currently opposed and consolidating.
        </p>
      </div>
    </div>
  );
}
