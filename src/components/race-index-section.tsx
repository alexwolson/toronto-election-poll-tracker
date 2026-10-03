import type { ReactNode } from "react";
import { RaceViewSwitcher } from "@/components/race-view-switcher";
import { ContentSection } from "@/components/content-section";
import type { RaceMap } from "@/types/feeds";

export function RaceIndexSection({
  headingId,
  title,
  note,
  map,
  children,
}: {
  headingId: string;
  title: ReactNode;
  note?: ReactNode;
  map: RaceMap | null;
  children: ReactNode;
}) {
  return (
    <ContentSection tint kicker="Explore the races" className="race-index-section" aria-labelledby={headingId}>
      <h2 id={headingId}>{title}</h2>
      {note}
      <RaceViewSwitcher map={map}>{children}</RaceViewSwitcher>
    </ContentSection>
  );
}
