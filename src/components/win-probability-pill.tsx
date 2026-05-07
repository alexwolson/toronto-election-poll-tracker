import { WinProbabilityBand } from "@/lib/vulnerability";

interface WinProbabilityPillProps {
  band: WinProbabilityBand;
}

const BAND_STYLE: Record<WinProbabilityBand, { color: string }> = {
  high:   { color: "var(--win-high-fg)" },
  medium: { color: "var(--win-med-fg)" },
  low:    { color: "var(--win-low-fg)" },
};

const BAND_ARROW: Record<WinProbabilityBand, string> = {
  high:   "↑",
  medium: "—",
  low:    "↓",
};

export function WinProbabilityPill({ band }: WinProbabilityPillProps) {
  const { color } = BAND_STYLE[band];
  return (
    <span className="np-tag" style={{ color, borderColor: color }}>
      {BAND_ARROW[band]} {band} win prob.
    </span>
  );
}
