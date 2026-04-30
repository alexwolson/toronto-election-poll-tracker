"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Mayor" },
  { href: "/wards", label: "Council" },
  { href: "/sources", label: "Sources & About" },
];

export function MastheadNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Site navigation" style={{ borderTop: "2px solid var(--line-strong)", display: "flex", justifyContent: "center" }}>
      {NAV_LINKS.map((link, i) => {
        const active =
          link.href === "/"
            ? pathname === "/"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className="font-mono"
            style={{
              fontSize: "0.68rem",
              fontWeight: 600,
              textTransform: "uppercase" as const,
              letterSpacing: "0.1em",
              padding: "0.55rem 1.5rem",
              borderRight:
                i < NAV_LINKS.length - 1 ? "1px solid var(--line-soft)" : "none",
              background: active ? "var(--text-strong)" : "transparent",
              color: active ? "#fff" : "var(--text-strong)",
              textDecoration: "none",
              display: "block",
            }}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
