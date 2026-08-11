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

function barGeometry(value: number, min: number, max: number, fmt: (v: number) => string) {
  const ratio = max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0.5;
  const indX = TRACK_X + ratio * TRACK_W;
  const labelX = Math.max(TRACK_X + 14, Math.min(TRACK_X + TRACK_W - 14, indX));
  return { indX, labelX, label: fmt(value) };
}

function BarSvg({ indX, labelX, label }: { indX: number; labelX: number; label: string }) {
  return (
    <svg viewBox={`0 0 ${BAR_W} ${BAR_H}`} role="img" aria-label={label}>
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
    <div className="coattail-bars">
      <div>
        <span className="coattail-kicker font-mono">Ward lean</span>
        <BarSvg indX={lean.indX} labelX={lean.labelX} label={lean.label} />
        <div className="signal-range-labels font-mono" aria-hidden="true"><span>less pro-Chow</span><span>more pro-Chow</span></div>
      </div>
      <div>
        <span className="coattail-kicker font-mono">Councillor alignment</span>
        <BarSvg indX={align.indX} labelX={align.labelX} label={align.label} />
        <div className="signal-range-labels font-mono" aria-hidden="true"><span>lower Chow support</span><span>higher Chow support</span></div>
      </div>
    </div>
  );
}
