"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Mayor" },
  { href: "/wards", label: "Council" },
];

export function MastheadNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Site navigation" style={{ borderTop: "2px solid #1a1a1a", display: "flex", justifyContent: "center" }}>
      {NAV_LINKS.map((link, i) => {
        const active =
          link.href === "/"
            ? pathname === "/"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            style={{
              fontFamily: "var(--font-ibm-mono), monospace",
              fontSize: "0.68rem",
              fontWeight: 600,
              textTransform: "uppercase" as const,
              letterSpacing: "0.1em",
              padding: "0.55rem 1.5rem",
              borderRight:
                i < NAV_LINKS.length - 1 ? "1px solid #ccc" : "none",
              background: active ? "#1a1a1a" : "transparent",
              color: active ? "#fff" : "#333",
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
