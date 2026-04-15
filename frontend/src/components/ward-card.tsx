import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ward } from "@/types/ward";
import { getVulnerabilityBand } from "@/lib/vulnerability";
import { VulnerabilityPill } from "@/components/vulnerability-pill";
import { getWardDisplayName } from "@/lib/ward-names";

interface WardCardProps {
  ward: Ward;
}

const CLASS_STYLES: Record<string, string> = {
  competitive: "bg-rose-100 text-rose-900 border border-rose-300/80",
  open: "bg-amber-100 text-amber-900 border border-amber-300/80",
};

export function WardCard({ ward }: WardCardProps) {
  const raceLabel = ward.race_class === "open"
    ? "Open Seat"
    : ward.race_class.charAt(0).toUpperCase() + ward.race_class.slice(1);
  const vulnerabilityBand = getVulnerabilityBand(ward.defeatability_score);
  const titleName = ward.is_running ? ward.councillor_name : "Open seat";
  const wardLabel = getWardDisplayName(ward.ward);

  return (
    <Link href={`/wards/${ward.ward}`} className="block">
      <Card className="surface-panel h-full cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--line-strong)]">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="font-heading text-xl">{wardLabel}</CardTitle>
            <div className="flex flex-col items-end gap-1">
              {ward.race_class !== "safe" && (
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    CLASS_STYLES[ward.race_class] ?? ""
                  }`}
                >
                  {raceLabel}
                </span>
              )}
              <VulnerabilityPill band={vulnerabilityBand} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="font-medium text-sm leading-tight">{titleName}</p>
          {ward.is_byelection_incumbent && (
            <p className="text-xs text-muted-foreground mt-1 font-mono uppercase tracking-wider">By-election incumbent</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
