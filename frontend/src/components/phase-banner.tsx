import { PhaseInfo } from "@/types/ward";

interface PhaseBannerProps {
  phase: PhaseInfo;
}

const PHASE_COLORS: Record<number, string> = {
  1: "bg-amber-50/80 border-amber-300/70 text-amber-950",
  2: "bg-sky-50/80 border-sky-300/70 text-sky-950",
  3: "bg-emerald-50/80 border-emerald-300/70 text-emerald-950",
};

export function PhaseBanner({ phase }: PhaseBannerProps) {
  const colors = PHASE_COLORS[phase.phase] ?? PHASE_COLORS[1];
  return (
    <div className={`border-b px-4 py-2 text-sm ${colors}`}>
      <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-1 md:px-3">
        <span className="font-mono text-[0.69rem] uppercase tracking-[0.14em]">Model phase</span>
        <span className="font-semibold">{phase.label}.</span>
        <span>{phase.description}</span>
      </div>
    </div>
  );
}
