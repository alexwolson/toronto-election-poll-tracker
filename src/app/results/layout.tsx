import type { ReactNode } from "react";
import { LiveLayout } from "@/components/results/live-layout";

/** One poller for the results page; the page draws its own `<main>` (results redesign). */
export default function ResultsLayout({ children }: { children: ReactNode }) {
  return <LiveLayout>{children}</LiveLayout>;
}
