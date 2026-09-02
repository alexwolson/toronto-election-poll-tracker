"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/candidates", label: "Mayor", activePaths: ["/candidates", "/polls"] },
  { href: "/wards", label: "Council" },
  { href: "/trustees", label: "Trustees" },
  { href: "/how-it-works", label: "How it works" },
];

export function MastheadNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Site navigation" className="site-nav">
      {NAV_LINKS.map((link) => {
        const activePaths = link.activePaths ?? [link.href];
        const active = activePaths.some(
          (path) => pathname === path || (path !== "/" && pathname.startsWith(`${path}/`)),
        );
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
