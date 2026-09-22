// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ForecastTabs } from "@/components/forecast/forecast-tabs";

const TABS = [
  { id: "shares", label: "What the vote could look like", content: <p>Ranges</p> },
  { id: "uncertainty", label: "Where the uncertainty comes from", content: <p>Ladder</p> },
];

function selected(tab: HTMLElement): boolean {
  return tab.getAttribute("aria-selected") === "true";
}

function panelHidden(text: string): boolean {
  return screen.getByText(text).closest('[role="tabpanel"]')!.hasAttribute("hidden");
}

afterEach(() => {
  cleanup();
});

describe("ForecastTabs", () => {
  it("shows the first view, keeps every panel in the markup, and switches on click", () => {
    render(<ForecastTabs label="More on the forecast" tabs={TABS} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual([
      "What the vote could look like",
      "Where the uncertainty comes from",
    ]);
    expect(tabs.map(selected)).toEqual([true, false]);
    expect(tabs[1].getAttribute("tabindex")).toBe("-1");
    expect(panelHidden("Ranges")).toBe(false);
    expect(panelHidden("Ladder")).toBe(true);

    fireEvent.click(tabs[1]);
    expect(tabs.map(selected)).toEqual([false, true]);
    expect(panelHidden("Ladder")).toBe(false);
    expect(panelHidden("Ranges")).toBe(true);
  });

  it("moves with the arrow keys, wrapping at the ends, and with Home and End", () => {
    render(<ForecastTabs label="More on the forecast" tabs={TABS} />);
    const tabs = screen.getAllByRole("tab");
    tabs[0].focus();
    fireEvent.keyDown(tabs[0], { key: "ArrowRight" });
    expect(tabs.map(selected)).toEqual([false, true]);
    expect(document.activeElement).toBe(tabs[1]);
    fireEvent.keyDown(tabs[1], { key: "ArrowRight" });
    expect(tabs.map(selected)).toEqual([true, false]);
    fireEvent.keyDown(tabs[0], { key: "ArrowLeft" });
    expect(tabs.map(selected)).toEqual([false, true]);
    fireEvent.keyDown(tabs[1], { key: "Home" });
    expect(tabs.map(selected)).toEqual([true, false]);
    fireEvent.keyDown(tabs[0], { key: "End" });
    expect(tabs.map(selected)).toEqual([false, true]);
  });

  it("labels each panel by its tab", () => {
    render(<ForecastTabs label="More on the forecast" tabs={TABS} />);
    const [first] = screen.getAllByRole("tab");
    const panel = screen.getByRole("tabpanel");
    expect(panel.getAttribute("aria-labelledby")).toBe(first.id);
    expect(first.getAttribute("aria-controls")).toBe(panel.id);
  });
});
