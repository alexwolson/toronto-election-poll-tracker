// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RaceMapView } from "@/components/race-map";
import type { RaceMap } from "@/types/feeds";

const MAP: RaceMap = {
  view_box: "0 0 1000 720",
  aria_label: "Example race map",
  palette: "council_attention",
  legend: [{ key: "open", label: "Open seat" }, { key: "quiet", label: "Lower attention" }],
  features: [
    {
      ward_id: "1",
      accessible_name: "Ward 1, West",
      path: "M0.00 0.00 L400.00 0.00 L400.00 720.00 L0.00 720.00 L0.00 0.00 Z",
      label: { x: 200, y: 360, text: "1", leader_line: null },
      signal_key: "open",
      signal_value: null,
      panel: {
        heading: "Ward 1 — West",
        geography: "West; North West",
        status: "Open seat",
        candidate_count: 3,
        incumbent_summary: "No incumbent is running",
        href: "/wards/1",
      },
    },
    {
      ward_id: "2",
      accessible_name: "Ward 2, East",
      path: "M400.00 0.00 L1000.00 0.00 L1000.00 720.00 L400.00 720.00 L400.00 0.00 Z",
      label: { x: 700, y: 360, text: "2", leader_line: null },
      signal_key: "quiet",
      signal_value: null,
      panel: {
        heading: "Ward 2 — East",
        geography: "East",
        status: "Lower attention",
        candidate_count: 2,
        incumbent_summary: "Incumbent: Example Person",
        href: "/wards/2",
      },
    },
  ],
};

afterEach(cleanup);

describe("RaceMapView", () => {
  it("previews temporarily, then restores the held selection", () => {
    render(<RaceMapView map={MAP} />);
    const east = screen.getByRole("button", { name: "Ward 2, East" });

    expect(screen.getByRole("heading", { name: "Ward 1 — West" })).toBeTruthy();
    fireEvent.mouseEnter(east);
    expect(screen.getByRole("heading", { name: "Ward 2 — East" })).toBeTruthy();
    fireEvent.mouseLeave(east);
    expect(screen.getByRole("heading", { name: "Ward 1 — West" })).toBeTruthy();
  });

  it("holds with click, Enter, and Space and updates the detail link", () => {
    render(<RaceMapView map={MAP} />);
    const west = screen.getByRole("button", { name: "Ward 1, West" });
    const east = screen.getByRole("button", { name: "Ward 2, East" });

    fireEvent.click(east);
    fireEvent.mouseLeave(east);
    expect(east.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("link", { name: /View race details/ }).getAttribute("href")).toBe("/wards/2");

    fireEvent.keyDown(west, { key: "Enter" });
    fireEvent.blur(west);
    expect(west.getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(east, { key: " " });
    fireEvent.blur(east);
    expect(east.getAttribute("aria-pressed")).toBe("true");
  });

  it("uses one tab stop and spatial arrow-key navigation", () => {
    render(<RaceMapView map={MAP} />);
    const west = screen.getByRole("button", { name: "Ward 1, West" });
    const east = screen.getByRole("button", { name: "Ward 2, East" });

    expect(west.getAttribute("tabindex")).toBe("0");
    expect(east.getAttribute("tabindex")).toBe("-1");

    west.focus();
    fireEvent.keyDown(west, { key: "ArrowRight" });

    expect(east.getAttribute("tabindex")).toBe("0");
    expect(east.getAttribute("aria-pressed")).toBe("true");
    expect(document.activeElement).toBe(east);
  });

  it("adds enlarged pointer geometry without adding accessible map controls", () => {
    const { container } = render(<RaceMapView map={MAP} />);
    expect(container.querySelectorAll(".race-map-hit-area")).toHaveLength(2);
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("organizes long area coverage as a readable list", () => {
    render(<RaceMapView map={MAP} />);
    expect(screen.getByText("West")).toBeTruthy();
    expect(screen.getByText("North West")).toBeTruthy();
  });

  it("omits facts already stated by the selected race heading or status", () => {
    const { container } = render(<RaceMapView map={MAP} />);
    const panel = container.querySelector(".race-map-panel");
    const east = screen.getByRole("button", { name: "Ward 2, East" });

    expect(panel?.textContent?.match(/Open seat/g)).toHaveLength(1);
    expect(panel?.textContent).not.toContain("No incumbent is running");
    expect(panel?.textContent).not.toContain("Selected race");
    expect(panel?.querySelectorAll(".race-map-panel__facts > div")).toHaveLength(1);
    expect(panel?.querySelector(".race-map-panel__facts dd")?.textContent).toBe("3");

    fireEvent.click(east);

    expect(panel?.querySelector(".race-map-panel__areas")).toBeNull();
    expect(panel?.textContent).toContain("Example Person");
    expect(panel?.textContent).not.toContain("Incumbent: Example Person");
  });
});
