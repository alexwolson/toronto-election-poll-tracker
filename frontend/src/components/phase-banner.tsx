import { PhaseInfo } from "@/types/ward";

interface PhaseBannerProps {
  phase: PhaseInfo;
}

const PHASE_COLORS: Record<number, string> = {
  1: "bg-yellow-50 border-yellow-300 text-yellow-900",
  2: "bg-blue-50 border-blue-300 text-blue-900",
  3: "bg-green-50 border-green-300 text-green-900",
};

export function PhaseBanner({ phase }: PhaseBannerProps) {
  const colors = PHASE_COLORS[phase.phase] ?? PHASE_COLORS[1];
  return (
    <div className={`border-b px-4 py-2 text-sm ${colors}`}>
      <span className="font-semibold">{phase.label}.</span>{" "}
      <span>{phase.description}</span>
    </div>
  );
}
