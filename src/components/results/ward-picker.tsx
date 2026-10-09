"use client";

/**
 * The ward picker and the remembered ward (#17 § Results pages and site changes;
 * #13). Choosing a ward here is the only thing that remembers it; the chip links
 * back to it and never redirects. No geolocation, postal-code or address lookup:
 * the MyVote pointer covers readers who don't know their ward.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore, type FormEvent } from "react";
import { wardLabel, type ResultsWard } from "@/lib/results-wards";
import { isResultsWard } from "@/lib/ward-ballot";
import { readRememberedWard, rememberWard } from "@/lib/ward-memory";

const MYVOTE_URL = "https://www.toronto.ca/city-government/elections/voter-information/myvote/";

/** Storage changes only through this page's own picker, which then navigates. */
const subscribe = () => () => {};

export function WardPicker({ wards, ward }: { wards: ResultsWard[]; ward: ResultsWard | null }) {
  const router = useRouter();
  // Null on the server and in the first hydration pass, so the markup matches.
  const remembered = useSyncExternalStore(subscribe, readRememberedWard, () => null);

  function choose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const chosen = new FormData(event.currentTarget).get("ward");
    if (typeof chosen !== "string" || !isResultsWard(chosen)) return;
    rememberWard(chosen);
    router.push(`/results/${chosen}`);
  }

  return (
    <div className="results-picker">
      <form onSubmit={choose}>
        <div className="field">
          <label htmlFor="results-ward">Your ward</label>
          <select id="results-ward" name="ward" defaultValue="">
            <option value="" disabled>
              Choose your ward
            </option>
            {wards.map((w) => (
              <option key={w.num} value={w.num}>
                {wardLabel(w)}
              </option>
            ))}
          </select>
          <p className="field__help">
            Not sure which ward you&apos;re in? Look it up with the City&apos;s{" "}
            <a href={MYVOTE_URL}>MyVote</a> tool.
          </p>
        </div>
        <button type="submit" className="btn btn--primary btn--sm">
          Show results
        </button>
      </form>
      {remembered !== null && remembered !== ward?.num && (
        <p>
          <Link href={`/results/${remembered}`} className="pill">
            Back to Ward {remembered}
          </Link>
        </p>
      )}
    </div>
  );
}
