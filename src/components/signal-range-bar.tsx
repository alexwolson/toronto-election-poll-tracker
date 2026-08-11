interface SignalRangeBarProps {
  value: number | undefined;
  min: number;
  max: number;
  formatValue: (v: number) => string;
  moreVulnerableSide?: "min" | "max"; // omit for neutral (non-vulnerability) bars
  minLabel: string;
  maxLabel: string;
}

const TRACK_X = 2;
const TRACK_W = 116;
const TRACK_Y = 14;
const TRACK_H = 4;
const TOTAL_W = 120;
const TOTAL_H = 24;

export function SignalRangeBar({
  value,
  min,
  max,
  formatValue,
  moreVulnerableSide,
  minLabel,
  maxLabel,
}: SignalRangeBarProps) {
  let indicatorX: number | null = null;
  let color = "var(--text-mid)";

  if (value !== undefined) {
    const ratio = max > min ? (value - min) / (max - min) : 0.5;
    indicatorX = TRACK_X + ratio * TRACK_W;

    if (moreVulnerableSide !== undefined) {
      const vulnerableRatio = moreVulnerableSide === "min" ? 1 - ratio : ratio;
      color =
        vulnerableRatio > 0.6 ? "var(--vuln-high-fg)" : vulnerableRatio < 0.35 ? "var(--vuln-low-line-hover)" : "var(--vuln-med-fg)";
    }
  }

  const labelX =
    indicatorX !== null
      ? Math.max(TRACK_X + 14, Math.min(TRACK_X + TRACK_W - 14, indicatorX))
      : null;

  return (
    <div className="signal-range">
      <svg
        viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`}
        role="img"
        aria-label={value === undefined ? "Signal value unavailable" : `${formatValue(value)}, from ${minLabel} to ${maxLabel}`}
      >
        <rect
          x={TRACK_X}
          y={TRACK_Y}
          width={TRACK_W}
          height={TRACK_H}
          fill="var(--track-bg)"
          rx={1}
        />

        {indicatorX !== null && labelX !== null && (
          <>
            <rect
              x={indicatorX - 1}
              y={TRACK_Y - 4}
              width={2}
              height={TRACK_H + 8}
              fill={color}
            />
            <text
              x={labelX}
              y={TRACK_Y - 5}
              textAnchor="middle"
              fontSize={8}
              fontFamily="var(--font-ibm-mono)"
              fontWeight={600}
              fill={color}
            >
              {formatValue(value!)}
            </text>
          </>
        )}
      </svg>
      <div className="signal-range-labels font-mono" aria-hidden="true">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}
