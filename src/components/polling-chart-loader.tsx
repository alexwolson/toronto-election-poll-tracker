"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import type { ChartSeries } from "./polling-chart";
import type { CandidateTrend } from "@/lib/polling";

export interface PollingChartGraphicProps {
  trends: CandidateTrend[];
  series: ChartSeries[];
}

export function PollingChartLoader(props: PollingChartGraphicProps) {
  const boundaryRef = useRef<HTMLDivElement>(null);
  const [Graphic, setGraphic] = useState<ComponentType<PollingChartGraphicProps> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let observer: IntersectionObserver | null = null;

    const load = async () => {
      try {
        const chartModule = await import("./polling-chart-graphic");
        if (active) setGraphic(() => chartModule.PollingChartGraphic);
      } catch {
        if (active) setFailed(true);
      }
    };

    const boundary = boundaryRef.current;
    if (!boundary || !("IntersectionObserver" in window)) {
      void load();
    } else {
      observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer?.disconnect();
          void load();
        },
        { rootMargin: "240px 0px" },
      );
      observer.observe(boundary);
    }

    return () => {
      active = false;
      observer?.disconnect();
    };
  }, []);

  return (
    <div ref={boundaryRef} className="polling-chart-graphic" aria-hidden="true">
      {Graphic ? (
        <Graphic {...props} />
      ) : (
        <div className={`polling-chart-loading${failed ? " polling-chart-loading--failed" : ""}`}>
          <span>{failed ? "Chart unavailable — the complete poll archive follows" : "Preparing polling chart"}</span>
        </div>
      )}
    </div>
  );
}
