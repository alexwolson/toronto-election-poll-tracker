// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MastheadNav } from "./masthead-nav";

vi.mock("next/navigation", () => ({ usePathname: () => "/polls" }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("mobile site navigation", () => {
  it("opens the controlled navigation and closes it after choosing a route", () => {
    render(<MastheadNav />);
    const toggle = screen.getByRole("button", { name: "Menu" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById(toggle.getAttribute("aria-controls")!)).not.toBeNull();
    expect(screen.getByRole("link", { name: "Mayor" }).getAttribute("aria-current")).toBe("page");
    fireEvent.click(screen.getByRole("link", { name: "Home" }));
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("returns focus to the toggle when dismissed with Escape", () => {
    render(<MastheadNav />);
    const toggle = screen.getByRole("button", { name: "Menu" });
    fireEvent.click(toggle);
    const council = screen.getByRole("link", { name: "Council" });
    council.focus();
    fireEvent.keyDown(council, { key: "Escape" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(toggle);
  });

  it("dismisses an open menu when a pointer lands outside the navigation", () => {
    render(<MastheadNav />);
    const toggle = screen.getByRole("button", { name: "Menu" });
    fireEvent.click(toggle);
    fireEvent.pointerDown(document.body);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });
});

describe("the Results menu item", () => {
  function at(iso: string) {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(Date.parse(iso));
  }

  it("follows Home and carries no live badge before 8 p.m. Oct 26", () => {
    at("2026-10-26T19:59:00-04:00");
    render(<MastheadNav />);
    const labels = screen.getAllByRole("link").map((link) => link.textContent);
    expect(labels.slice(0, 2)).toEqual(["Home", "Results"]);
    expect(screen.getByRole("link", { name: "Results" }).getAttribute("href")).toBe("/results");
    expect(document.querySelector(".badge--live")).toBeNull();
  });

  it("shows the live badge from 20:00 EDT Oct 26, including on a menu left open", () => {
    at("2026-10-26T19:59:30-04:00");
    render(<MastheadNav />);
    act(() => vi.advanceTimersByTime(30_000));
    const results = screen.getByRole("link", { name: "Results Live" });
    expect(results.querySelector(".badge.badge--live")?.textContent).toBe("Live");
  });
});
