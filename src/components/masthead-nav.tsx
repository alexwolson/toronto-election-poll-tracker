"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Mayor" },
  { href: "/polls", label: "Polls" },
  { href: "/wards", label: "Council" },
  { href: "/sources", label: "About" },
];

export function MastheadNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Site navigation" className="site-nav">
      {NAV_LINKS.map((link) => {
        const active =
          link.href === "/"
            ? pathname === "/"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`font-mono nav-link${active ? " nav-link--active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
