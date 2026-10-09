import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { cityWardAreaNames, cityWardsLabel } from "@/lib/trustees";
import type { CouncilRaceCardsFeed } from "@/types/feeds";

interface TrusteeWardCoverageProps {
  cityWards: number[];
  council: CouncilRaceCardsFeed;
  className?: string;
  /** Link each City ward to its results page (#39). Never inside another link. */
  linkResults?: boolean;
}

function joinedNodes(nodes: ReactNode[]): ReactNode {
  return nodes.map((node, index) => {
    const separator =
      index === 0 ? "" : index < nodes.length - 1 ? ", " : nodes.length > 2 ? ", and " : " and ";
    return (
      <Fragment key={index}>
        {separator}
        {node}
      </Fragment>
    );
  });
}

export function TrusteeWardCoverage({
  cityWards,
  council,
  className,
  linkResults = false,
}: TrusteeWardCoverageProps) {
  const areaNames = cityWardAreaNames(cityWards, council);
  const rootClass = ["trustee-ward-coverage", className].filter(Boolean).join(" ");
  // Without every ward's name, coverage reads "City Wards 1 and 7", as unlinked.
  const labels = areaNames.length > 0 ? areaNames : cityWards.map(String);
  const prefix = areaNames.length > 0 ? "" : cityWards.length === 1 ? "City Ward " : "City Wards ";
  const area = (index: number) =>
    linkResults ? (
      <Link href={`/results/${cityWards[index]}`} className="text-link">
        {labels[index]}
      </Link>
    ) : (
      labels[index]
    );

  if (areaNames.length <= 3) {
    return (
      <span className={rootClass}>
        {linkResults
          ? (
            <>
              {prefix}
              {joinedNodes(cityWards.map((_, index) => area(index)))}
            </>
          )
          : cityWardsLabel(cityWards, council)}
      </span>
    );
  }

  return (
    <span className={`${rootClass} trustee-ward-coverage--expanded`}>
      <span className="trustee-ward-coverage__label">Areas covered</span>
      <span className="trustee-ward-coverage__areas" role="list">
        {areaNames.map((areaName, index) => (
          <span className="trustee-ward-coverage__area" role="listitem" key={areaName}>
            {area(index)}
          </span>
        ))}
      </span>
    </span>
  );
}
