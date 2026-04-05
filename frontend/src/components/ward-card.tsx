import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ward } from "@/types/ward";

interface WardCardProps {
  ward: Ward;
}

const CLASS_STYLES: Record<string, string> = {
  safe: "bg-green-100 text-green-800",
  competitive: "bg-red-100 text-red-800",
  open: "bg-purple-100 text-purple-800",
};

export function WardCard({ ward }: WardCardProps) {
  const winPct = ward.is_running
    ? `${(ward.win_probability * 100).toFixed(0)}%`
    : "Open";

  const raceLabel = ward.race_class === "open"
    ? "Open Seat"
    : ward.race_class.charAt(0).toUpperCase() + ward.race_class.slice(1);

  return (
    <Link href={`/wards/${ward.ward}`} className="block">
      <Card className="hover:border-primary transition-colors cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base">Ward {ward.ward}</CardTitle>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                CLASS_STYLES[ward.race_class] ?? ""
              }`}
            >
              {raceLabel}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="font-medium text-sm">{ward.councillor_name}</p>
          <div className="flex justify-between items-baseline mt-1">
            <p className="text-sm text-muted-foreground">
              Defeatability: {ward.defeatability_score}
            </p>
            <p className="text-sm font-semibold">{winPct}</p>
          </div>
          {ward.is_byelection_incumbent && (
            <p className="text-xs text-muted-foreground mt-1">By-election incumbent</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
