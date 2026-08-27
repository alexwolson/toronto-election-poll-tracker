import { cityWardAreaNames, cityWardsLabel } from "@/lib/trustees";
import type { CouncilRaceCardsFeed } from "@/types/feeds";

interface TrusteeWardCoverageProps {
  cityWards: number[];
  council: CouncilRaceCardsFeed;
  className?: string;
}

export function TrusteeWardCoverage({
  cityWards,
  council,
  className,
}: TrusteeWardCoverageProps) {
  const areaNames = cityWardAreaNames(cityWards, council);
  const rootClass = ["trustee-ward-coverage", className].filter(Boolean).join(" ");

  if (areaNames.length <= 3) {
    return <span className={rootClass}>{cityWardsLabel(cityWards, council)}</span>;
  }

  return (
    <span className={`${rootClass} trustee-ward-coverage--expanded`}>
      <span className="trustee-ward-coverage__label">Areas covered</span>
      <span className="trustee-ward-coverage__areas" role="list">
        {areaNames.map((areaName) => (
          <span className="trustee-ward-coverage__area" role="listitem" key={areaName}>
            {areaName}
          </span>
        ))}
      </span>
    </span>
  );
}
