/**
 * The remembered ward (#17 § Results pages and site changes; #13): the last ward
 * the reader chose with the picker. Only the picker writes it; tile taps and
 * shared links never do, and it never redirects. With storage blocked, nothing
 * is remembered and the page works normally.
 */

import { isResultsWard } from "@/lib/ward-ballot";

const KEY = "results-ward";

/** The remembered ward, or null when there is none or storage is blocked. */
export function readRememberedWard(): string | null {
  try {
    const ward = window.localStorage.getItem(KEY);
    return ward !== null && isResultsWard(ward) ? ward : null;
  } catch {
    return null;
  }
}

export function rememberWard(ward: string): void {
  try {
    window.localStorage.setItem(KEY, ward);
  } catch {
    // Blocked or full storage: remember nothing.
  }
}
