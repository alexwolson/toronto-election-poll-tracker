import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MarginDistribution } from "./margin-distribution";
import type { MarginDistributionView } from "@/lib/mayoral-forecast";

const bands = [
  { name: "Close", loPp: 0, hiPp: 5, weight: 1 },
  { name: "Clear win", loPp: 5, hiPp: 15, weight: 0.8 },
  { name: "Comfortable", loPp: 15, hiPp: 30, weight: 0.4 },
  { name: "Landslide", loPp: 30, hiPp: 50, weight: 0.1 },
];

const view: MarginDistributionView = {
  points: [],
  closeThresholdPp: 5,
  bands,
  segments: [
    {
      id: "chow",
      label: "Chow wins",
      colorVar: "var(--color-chow)",
      hatch: false,
      bands: bands.map((band) => ({ ...band, weight: band.weight * 0.75 })),
    },
    {
      id: "alexander",
      label: "Alexander wins",
      colorVar: "var(--color-alexander)",
      hatch: true,
      bands: bands.map((band) => ({ ...band, weight: band.weight * 0.25 })),
    },
    {
      id: "other",
      label: "Other candidate wins",
      colorVar: "var(--color-disengaged)",
      hatch: false,
      bands: bands.map((band) => ({ ...band, weight: 0 })),
    },
  ],
  markers: [],
};

describe("MarginDistribution", () => {
  it("renders one candidate-coloured stack with a legend", () => {
    const html = renderToStaticMarkup(<MarginDistribution view={view} />);
    expect(html).toContain('<details class="margin-dist-detail">');
    expect(html).not.toContain('<details class="margin-dist-detail" open');
    expect(html).toContain('aria-label="Forecast winner colours"');
    expect(html).toContain(
      'aria-label="The forecast margin between the top two candidates',
    );
    expect(html).toContain("Most likely winning margin");
    expect(html).toContain("Within 5 points");
    expect(html).toContain("View the full margin chart and past elections");
    expect(html).toContain("Chow wins");
    expect(html).toContain("Alexander wins");
    expect(html).toContain('fill="var(--color-chow)"');
    expect(html).toContain('fill="url(#margin-dist-hatch-alexander)"');
    expect(html).not.toContain("button");
  });

  it("renders one segment per winner for every margin band", () => {
    const html = renderToStaticMarkup(<MarginDistribution view={view} />);
    expect((html.match(/class="margin-dist__segment"/g) ?? [])).toHaveLength(12);
    expect(html).toContain("Chow wins: Close");
    expect(html).toContain("Alexander wins: Landslide");
  });
});
