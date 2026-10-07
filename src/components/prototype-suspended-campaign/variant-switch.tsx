"use client";

/**
 * PROTOTYPE (throwaway). Picks one of the server-rendered variant trees by
 * ?variant= (default A). NoticeSwitch shows the live site notice only on
 * ?variant=live, because each variant replaces the notice its own way.
 */
import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { PrototypeSwitcher } from "@/components/prototype-switcher";
import { VARIANTS } from "./data";

export function VariantSwitch({ variants }: { variants: Record<string, ReactNode> }) {
  const key = useSearchParams().get("variant") ?? VARIANTS[0].key;
  return (
    <>
      {variants[key] ?? variants[VARIANTS[0].key]}
      <PrototypeSwitcher variants={VARIANTS} />
    </>
  );
}

export function NoticeSwitch({ live }: { live: ReactNode }) {
  const key = useSearchParams().get("variant") ?? VARIANTS[0].key;
  return key === "live" ? <>{live}</> : null;
}
