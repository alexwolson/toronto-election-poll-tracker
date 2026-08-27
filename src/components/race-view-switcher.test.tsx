// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RaceViewSwitcher } from "@/components/race-view-switcher";
import type { RaceMap } from "@/types/feeds";

const MAP: RaceMap = {
  view_box: "0 0 1000 720",
  aria_label: "One ward",
  palette: "tdsb_race_structure",
  legend: [{ key: "open", label: "Open race" }],
  features: [{
    ward_id: "1",
    accessible_name: "Ward 1",
    path: "M0.00 0.00 L1000.00 0.00 L1000.00 720.00 L0.00 720.00 L0.00 0.00 Z",
    label: { x: 500, y: 360, text: "1", leader_line: null },
    signal_key: "open",
    signal_value: null,
    panel: {
      heading: "Ward 1",
      geography: "Toronto",
      status: "Open race",
      candidate_count: 2,
      incumbent_summary: "No incumbent is running",
      href: "/trustees/tdsb/1",
    },
  }],
};

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("RaceViewSwitcher", () => {
  it("starts with the list and hides the switch entirely without a map", () => {
    const { rerender } = render(
      <RaceViewSwitcher map={MAP}><p>Race list</p></RaceViewSwitcher>,
    );
    expect(screen.getByRole("button", { name: "List" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Race list").parentElement?.hidden).toBe(false);

    rerender(<RaceViewSwitcher map={null}><p>Race list</p></RaceViewSwitcher>);
    expect(screen.queryByRole("button", { name: "Map" })).toBeNull();
  });

  it("shares the map preference across switchers in one session", async () => {
    const first = render(
      <RaceViewSwitcher map={MAP}><p>Council list</p></RaceViewSwitcher>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Map" }));
    expect(screen.getByRole("button", { name: "Map" }).getAttribute("aria-pressed")).toBe("true");
    first.unmount();

    render(<RaceViewSwitcher map={MAP}><p>Trustee list</p></RaceViewSwitcher>);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Map" }).getAttribute("aria-pressed")).toBe("true");
    });
  });

  it("keeps working when session storage is unavailable", async () => {
    const initial = render(
      <RaceViewSwitcher map={MAP}><p>Initial list</p></RaceViewSwitcher>,
    );
    fireEvent.click(screen.getByRole("button", { name: "List" }));
    initial.unmount();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage denied");
    });

    const denied = render(
      <RaceViewSwitcher map={MAP}><p>Private list</p></RaceViewSwitcher>,
    );
    expect(screen.getByRole("button", { name: "List" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Map" }));
    denied.unmount();
    render(<RaceViewSwitcher map={MAP}><p>Second private list</p></RaceViewSwitcher>);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Map" }).getAttribute("aria-pressed")).toBe("true");
    });
  });
});
