"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isResultsPath } from "@/lib/race-links";

/**
 * CHW's announcement banner, above the masthead on every page but the results
 * themselves: the way to the final count now the site is a static archive. One fixed
 * message, so the prerendered page and the browser agree. It has no dismiss control,
 * so it carries no state.
 */
export function ElectionBanner() {
  const pathname = usePathname();
  if (pathname && isResultsPath(pathname)) return null;
  return (
    <div className="banner" role="region" aria-label="Election announcement">
      <div className="wrap banner__inner">
        <Link className="banner__link" href="/results">
          <span className="banner__flag">Final results</span>
          <span className="banner__text">
            The 2026 election is over. The forecast is archived as last published on Oct 26.
          </span>
          <span className="banner__cta">See the results →</span>
        </Link>
      </div>
    </div>
  );
}
