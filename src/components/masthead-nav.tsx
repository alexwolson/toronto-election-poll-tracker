"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/candidates", label: "Mayor", activePaths: ["/candidates", "/polls"] },
  { href: "/wards", label: "Council" },
  { href: "/trustees", label: "Trustees" },
  { href: "/how-it-works", label: "How it works" },
];

export function MastheadNav() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const navigation = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!expanded) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !navigation.current?.contains(event.target)) {
        setExpanded(false);
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [expanded]);

  return (
    <nav
      ref={navigation}
      aria-label="Site navigation"
      className="site-nav"
      onKeyDown={(event) => {
        if (event.key === "Escape" && expanded) {
          setExpanded(false);
          toggle.current?.focus();
        }
      }}
    >
      <button
        ref={toggle}
        className="site-nav__toggle"
        type="button"
        aria-controls="site-navigation-links"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Close" : "Menu"}
        <span className="site-nav__chevron" aria-hidden="true" />
      </button>
      <div id="site-navigation-links" className={`site-nav__links${expanded ? " site-nav__links--open" : ""}`}>
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
              onClick={() => setExpanded(false)}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
