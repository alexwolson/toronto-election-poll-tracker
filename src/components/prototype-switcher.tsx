"use client";

/**
 * PROTOTYPE switcher (throwaway). A floating pill that cycles ?variant= with the
 * arrows or the ← → keys. Hidden in production builds.
 */
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface PrototypeVariant {
  key: string;
  name: string;
}

export function PrototypeSwitcher({ variants }: { variants: PrototypeVariant[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("variant") ?? variants[0].key;
  const index = Math.max(
    0,
    variants.findIndex((v) => v.key === current),
  );

  useEffect(() => {
    const go = (delta: number) => {
      const next = variants[(index + delta + variants.length) % variants.length];
      const query = new URLSearchParams(params.toString());
      query.set("variant", next.key);
      router.replace(`${pathname}?${query.toString()}`, { scroll: false });
    };
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, params, pathname, router, variants]);

  if (process.env.NODE_ENV === "production") return null;

  const go = (delta: number) => {
    const next = variants[(index + delta + variants.length) % variants.length];
    const query = new URLSearchParams(params.toString());
    query.set("variant", next.key);
    router.replace(`${pathname}?${query.toString()}`, { scroll: false });
  };
  const variant = variants[index];
  const button: React.CSSProperties = {
    background: "transparent",
    border: 0,
    color: "#fff",
    font: "inherit",
    fontSize: 18,
    cursor: "pointer",
    padding: "0 10px",
  };
  return (
    <div
      role="toolbar"
      aria-label="Prototype variant switcher"
      style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "8px 10px",
        borderRadius: 999,
        background: "#111",
        color: "#fff",
        boxShadow: "0 6px 24px rgba(0,0,0,.35)",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 13,
      }}
    >
      <button type="button" style={button} onClick={() => go(-1)} aria-label="Previous variant">
        ←
      </button>
      <span>
        PROTOTYPE · {variant.key} ({variant.name})
      </span>
      <button type="button" style={button} onClick={() => go(1)} aria-label="Next variant">
        →
      </button>
    </div>
  );
}
