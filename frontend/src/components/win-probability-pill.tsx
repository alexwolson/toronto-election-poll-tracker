import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { WinProbabilityBand } from "@/lib/vulnerability";

interface WinProbabilityPillProps {
  band: WinProbabilityBand;
}

const BAND_STYLE: Record<WinProbabilityBand, string> = {
  low: "bg-rose-100 text-rose-900 border-rose-300/80",
  medium: "bg-amber-100 text-amber-900 border-amber-300/80",
  high: "bg-emerald-100 text-emerald-900 border-emerald-300/80",
};

export function WinProbabilityPill({ band }: WinProbabilityPillProps) {
  const Icon = band === "high" ? ArrowUpRight : band === "low" ? ArrowDownRight : Minus;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.7rem] font-mono uppercase tracking-[0.1em] ${BAND_STYLE[band]}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {band} win probability
    </span>
  );
}
