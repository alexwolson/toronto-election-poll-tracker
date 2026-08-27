import {
  showTrusteeRaceContextTag,
  trusteeRaceContextClass,
  trusteeRaceContextLabel,
  type TrusteeRaceContextCategory,
} from "@/lib/trustees";

export function TrusteeRaceContextTag({
  category,
}: {
  category: TrusteeRaceContextCategory;
}) {
  if (!showTrusteeRaceContextTag(category)) return null;
  return (
    <span
      className={`trustee-race-context trustee-race-context--${trusteeRaceContextClass(category)}`}
    >
      {trusteeRaceContextLabel(category)}
    </span>
  );
}
