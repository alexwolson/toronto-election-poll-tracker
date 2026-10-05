"use client";

/**
 * PROTOTYPE — throwaway floating variant switcher (prototype skill, UI branch). Cycles the
 * `?variant=` search param with the arrows or ← / →, and hosts any extra prototype controls the
 * route passes as children. Never rendered in a production build.
 */
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

export interface PrototypeVariant {
  key: string;
  name: string;
}

export function usePrototypeParam() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) next.delete(key);
        else next.set(key, value);
      }
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );
}

export function PrototypeSwitcher({
  variants,
  current,
  children,
}: {
  variants: PrototypeVariant[];
  current: string;
  children?: ReactNode;
}) {
  const setParam = usePrototypeParam();
  const [open, setOpen] = useState(true);
  const index = Math.max(0, variants.findIndex((v) => v.key === current));
  const go = useCallback(
    (step: number) => setParam({ variant: variants[(index + step + variants.length) % variants.length].key }),
    [index, setParam, variants],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (process.env.NODE_ENV === "production") return null;
  const variant = variants[index];
  return (
    <div className="prototype-switcher" role="region" aria-label="Prototype controls">
      <div className="prototype-switcher__variant">
        <button type="button" onClick={() => go(-1)} aria-label="Previous variant">←</button>
        <span>
          <strong>{variant.key}</strong> {variant.name}
        </span>
        <button type="button" onClick={() => go(1)} aria-label="Next variant">→</button>
        {children && (
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? "Hide" : "Controls"}
          </button>
        )}
      </div>
      {open && children}
    </div>
  );
}
