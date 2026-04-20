import { Focus, CircleDashed, Orbit } from "lucide-react";
import { UncertaintyBand } from "@/lib/vulnerability";

interface UncertaintyPillProps {
  band: UncertaintyBand;
}

const BAND_STYLE: Record<UncertaintyBand, string> = {
  tight: "bg-emerald-100 text-emerald-900 border-emerald-300/80",
  moderate: "bg-amber-100 text-amber-900 border-amber-300/80",
  wide: "bg-rose-100 text-rose-900 border-rose-300/80",
};

export function UncertaintyPill({ band }: UncertaintyPillProps) {
  const Icon = band === "tight" ? Focus : band === "moderate" ? CircleDashed : Orbit;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.7rem] font-mono uppercase tracking-[0.1em] ${BAND_STYLE[band]}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {band} uncertainty
    </span>
  );
}
