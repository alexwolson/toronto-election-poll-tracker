import type { ReactNode } from "react";
import { LiveLayout } from "@/components/results/live-layout";

export default function Layout({ children }: { children: ReactNode }) {
  return <LiveLayout>{children}</LiveLayout>;
}
