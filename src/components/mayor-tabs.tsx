import Link from "next/link";

const MAYOR_TABS = [
  { id: "candidates", href: "/candidates", label: "Candidates" },
  { id: "polls", href: "/polls", label: "Polls" },
] as const;

export function MayorTabs({
  activeTab,
}: {
  activeTab: (typeof MAYOR_TABS)[number]["id"];
}) {
  return (
    <nav className="mayor-tabs" aria-label="Mayor">
      {MAYOR_TABS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={`mayor-tab${activeTab === tab.id ? " mayor-tab--active" : ""}`}
          aria-current={activeTab === tab.id ? "page" : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
