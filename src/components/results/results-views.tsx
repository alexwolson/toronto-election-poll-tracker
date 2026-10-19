"use client";

/**
 * The results pages' views (live-projection #103): Races (the cards), Map, Count and Tables (#123),
 * chosen by `?view=` so a view can be shared. The pages are static, so the search params
 * are read in the browser behind a Suspense boundary; the prerendered HTML shows Races.
 */

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { RouteTabs } from "@/components/route-tabs";

export type ResultsViewId = "races" | "map" | "count" | "tables";

export function viewFrom(param: string | null): ResultsViewId {
  return param === "map" || param === "count" || param === "tables" ? param : "races";
}

interface ViewsProps {
  races: ReactNode;
  map: ReactNode;
  count: ReactNode;
  tables: ReactNode;
}

function Views({ view, races, map, count, tables }: ViewsProps & { view: ResultsViewId }) {
  const pathname = usePathname();
  const items = [
    { id: "races", href: pathname, label: "Races" },
    { id: "map", href: `${pathname}?view=map`, label: "Map" },
    { id: "count", href: `${pathname}?view=count`, label: "Count" },
    { id: "tables", href: `${pathname}?view=tables`, label: "Tables" },
  ] as const;
  return (
    <>
      <RouteTabs label="Results views" items={items} activeId={view} />
      {view === "map" ? map : view === "count" ? count : view === "tables" ? tables : races}
    </>
  );
}

function ViewsFromUrl(props: ViewsProps) {
  return <Views view={viewFrom(useSearchParams().get("view"))} {...props} />;
}

export function ResultsViews(props: ViewsProps) {
  return (
    <Suspense fallback={<Views view="races" {...props} />}>
      <ViewsFromUrl {...props} />
    </Suspense>
  );
}
