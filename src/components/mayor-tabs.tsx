import { RouteTabs } from "@/components/route-tabs";

const MAYOR_TABS = [
  { id: "candidates", href: "/candidates", label: "Candidates" },
  { id: "polls", href: "/polls", label: "Polls" },
] as const;

export function MayorTabs({
  activeTab,
}: {
  activeTab: (typeof MAYOR_TABS)[number]["id"];
}) {
  return <RouteTabs label="Mayor" items={MAYOR_TABS} activeId={activeTab} />;
}
