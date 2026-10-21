"use client";

/**
 * Your ward on the results dashboard (Alex, 2026-10-20: the ballot pages are gone): choosing a
 * ward highlights it, putting its races first and adding its bars to the mayor, and remembers it
 * (#13). It never navigates away. No geolocation, postal-code or address lookup: the MyVote
 * pointer covers readers who don't know their ward.
 */

import type { FormEvent } from "react";
import { wardLabel, type ResultsWard } from "@/lib/results-wards";
import { isResultsWard } from "@/lib/ward-ballot";
import { rememberWard } from "@/lib/ward-memory";

const MYVOTE_URL = "https://www.toronto.ca/city-government/elections/voter-information/myvote/";

export function WardPicker({
  wards,
  ward,
  onChoose,
}: {
  wards: ResultsWard[];
  /** The highlighted ward, if any. */
  ward: ResultsWard | null;
  onChoose: (ward: string) => void;
}) {
  function choose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const chosen = new FormData(event.currentTarget).get("ward");
    if (typeof chosen !== "string" || !isResultsWard(chosen)) return;
    rememberWard(chosen);
    onChoose(chosen);
  }

  return (
    <div className="results-picker">
      <form onSubmit={choose} className="results-picker__form">
        <label htmlFor="results-ward">Your ward</label>
        <select id="results-ward" name="ward" key={ward?.num ?? ""} defaultValue={ward?.num ?? ""}>
          <option value="" disabled>
            Choose your ward
          </option>
          {wards.map((w) => (
            <option key={w.num} value={w.num}>
              {wardLabel(w)}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn--primary btn--sm">
          Show
        </button>
      </form>
      <p className="results-picker__help">
        <a href={MYVOTE_URL}>
          Don&apos;t know your ward? <span className="results-picker__nowrap">Look it up on MyVote ↗</span>
        </a>
      </p>
    </div>
  );
}
