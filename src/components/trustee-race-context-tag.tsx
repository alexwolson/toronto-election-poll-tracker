import {
  showTrusteeRaceContextTag,
  trusteeRaceContextClass,
  trusteeRaceContextLabel,
  type TrusteeRaceContextCategory,
} from "@/lib/trustees";
import { cn } from "@/lib/utils";

export function TrusteeRaceContextTag({
  category,
  className,
}: {
  category: TrusteeRaceContextCategory;
  className?: string;
}) {
  if (!showTrusteeRaceContextTag(category)) return null;
  return (
    <span
      className={cn(
        "trustee-race-context",
        `trustee-race-context--${trusteeRaceContextClass(category)}`,
        className,
      )}
    >
      {trusteeRaceContextLabel(category)}
    </span>
  );
}
