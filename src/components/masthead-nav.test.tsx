// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MastheadNav } from "./masthead-nav";

vi.mock("next/navigation", () => ({ usePathname: () => "/polls" }));
afterEach(cleanup);

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
