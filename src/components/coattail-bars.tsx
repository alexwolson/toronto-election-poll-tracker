interface CoattailBarsProps {
  wardLean: number;
  leanMin: number;
  leanMax: number;
  alignment: number;
  alignMin: number;
  alignMax: number;
}

const TRACK_X = 2;
const TRACK_W = 116;
const TRACK_Y = 16;
const TRACK_H = 4;
const BAR_W = 120;
const BAR_H = 24;

// Must match LEFT_LABEL_MIN_W in signal-range-bar.tsx so all tracks align
const LEFT_LABEL_MIN_W = "6rem";

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-ibm-mono)",
  fontSize: "0.6rem",
  color: "var(--text-faint)",
  whiteSpace: "nowrap",
  alignSelf: "center",
};

const KICKER_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-ibm-mono)",
  fontSize: "0.58rem",
  color: "var(--text-soft)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  gridColumn: "1 / -1",
};

function barGeometry(value: number, min: number, max: number, fmt: (v: number) => string) {
  const ratio = max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0.5;
  const indX = TRACK_X + ratio * TRACK_W;
  const labelX = Math.max(TRACK_X + 14, Math.min(TRACK_X + TRACK_W - 14, indX));
  return { indX, labelX, label: fmt(value) };
}

function BarSvg({ indX, labelX, label }: { indX: number; labelX: number; label: string }) {
  return (
    <svg viewBox={`0 0 ${BAR_W} ${BAR_H}`} width={BAR_W} height={BAR_H} style={{ display: "block" }}>
      <rect x={TRACK_X} y={TRACK_Y} width={TRACK_W} height={TRACK_H} fill="var(--track-bg)" rx={1} />
      <rect x={indX - 1} y={TRACK_Y - 4} width={2} height={TRACK_H + 8} fill="var(--track-fill)" />
      <text
        x={labelX} y={TRACK_Y - 5}
        textAnchor="middle" fontSize={8}
        fontFamily="var(--font-ibm-mono)"
        fontWeight={600} fill="var(--track-fill)"
      >
        {label}
      </text>
    </svg>
  );
}

export function CoattailBars({
  wardLean, leanMin, leanMax,
  alignment, alignMin, alignMax,
}: CoattailBarsProps) {
  const lean = barGeometry(
    wardLean, leanMin, leanMax,
    v => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`,
  );
  const align = barGeometry(
    alignment, alignMin, alignMax,
    v => `${(v * 100).toFixed(0)}%`,
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: `${LEFT_LABEL_MIN_W} ${BAR_W}px max-content`, rowGap: "0.1rem" }}>
      {/* Kicker 1 */}
      <div style={KICKER_STYLE}>Ward lean</div>

      {/* Bar 1 */}
      <span style={{ ...LABEL_STYLE, textAlign: "right", paddingRight: "0.4rem" }}>less pro-Chow</span>
      <BarSvg indX={lean.indX} labelX={lean.labelX} label={lean.label} />
      <span style={{ ...LABEL_STYLE, paddingLeft: "0.4rem" }}>more pro-Chow</span>

      {/* Kicker 2 */}
      <div style={{ ...KICKER_STYLE, paddingTop: "0.25rem" }}>Councillor alignment</div>

      {/* Bar 2 */}
      <span style={{ ...LABEL_STYLE, textAlign: "right", paddingRight: "0.4rem" }}>anti-Chow</span>
      <BarSvg indX={align.indX} labelX={align.labelX} label={align.label} />
      <span style={{ ...LABEL_STYLE, paddingLeft: "0.4rem" }}>pro-Chow</span>
    </div>
  );
}
