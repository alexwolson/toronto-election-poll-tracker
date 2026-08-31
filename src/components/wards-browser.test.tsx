// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WardsBrowser } from "@/components/wards-browser";
import type { WardIndexItem } from "@/lib/council";

const ITEMS: WardIndexItem[] = [
  {
    ward: "1",
    wardNum: 1,
    name: "Etobicoke North",
    incumbentName: "Example Councillor",
    isOpen: false,
    attention: "elevated",
    score: 2,
    triggers: [],
  },
  {
    ward: "2",
    wardNum: 2,
    name: "Etobicoke Centre",
    incumbentName: null,
    isOpen: true,
    attention: "open",
    score: 3,
    triggers: [],
  },
];

afterEach(cleanup);

describe("WardsBrowser", () => {
  it("labels the search, reports the count, and explains a zero-result search", () => {
    render(<WardsBrowser items={ITEMS} />);

    const search = screen.getByRole("searchbox", { name: "Find a ward" });
    expect(screen.getByText("2 of 2 wards shown")).toBeTruthy();

    fireEvent.change(search, { target: { value: "not-a-real-ward" } });

    expect(screen.getByRole("status").textContent).toContain(
      "No wards match “not-a-real-ward”",
    );
    expect(screen.getByText("0 of 2 wards shown")).toBeTruthy();
  });
});
