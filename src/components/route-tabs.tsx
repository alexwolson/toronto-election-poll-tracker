import Link from "next/link";

export interface RouteTabItem<Id extends string> {
  id: Id;
  href: string;
  label: string;
}

export interface RouteTabsProps<Id extends string> {
  label: string;
  items: readonly RouteTabItem<Id>[];
  activeId: Id;
}

/**
 * Page-level route navigation. Items stay full-width when space permits and
 * scroll horizontally on narrow screens instead of truncating their labels.
 */
export function RouteTabs<Id extends string>({
  label,
  items,
  activeId,
}: RouteTabsProps<Id>) {
  return (
    <nav className="route-tabs" aria-label={label}>
      {items.map((item) => {
        const active = activeId === item.id;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`route-tab${active ? " route-tab--active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
