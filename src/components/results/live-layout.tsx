import type { ReactNode } from "react";
import { LiveResultsProvider } from "./live-results-poller";

/** Every live page polls once, whatever route it sits under (results redesign), inside the results
 *  pages' own look (results-ui.css). The page draws its own `<main>`. */
export function LiveLayout({ children }: { children: ReactNode }) {
  return (
    <LiveResultsProvider>
      <div className="results-ui">{children}</div>
    </LiveResultsProvider>
  );
}
