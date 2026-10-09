// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { readRememberedWard, rememberWard } from "@/lib/ward-memory";

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

/** Storage blocked: a private window or blocked site data, where the accessor throws. */
function blockStorage() {
  vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
    throw new DOMException("The operation is insecure.", "SecurityError");
  });
}

describe("ward memory (#17 § Results pages, #13)", () => {
  it("remembers the last ward chosen", () => {
    expect(readRememberedWard()).toBeNull();
    rememberWard("14");
    rememberWard("3");
    expect(readRememberedWard()).toBe("3");
  });

  it("ignores a stored value that is not a City ward", () => {
    window.localStorage.setItem("results-ward", "26");
    expect(readRememberedWard()).toBeNull();
  });

  it("with storage blocked, remembers nothing and never throws", () => {
    blockStorage();
    expect(() => rememberWard("14")).not.toThrow();
    expect(readRememberedWard()).toBeNull();
  });

  it("with writes refused, never throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    expect(() => rememberWard("14")).not.toThrow();
  });
});
