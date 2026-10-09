import type { ReactNode } from "react";
import { LiveResultsProvider } from "@/components/results/live-results-poller";

/** One poller for every results page: it persists across ward navigations, so a
 *  tile tap opens that ward with no fetch (#17 § Payload). */
export default function ResultsLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" className="np-shell">
      <LiveResultsProvider>{children}</LiveResultsProvider>
    </main>
  );
}
