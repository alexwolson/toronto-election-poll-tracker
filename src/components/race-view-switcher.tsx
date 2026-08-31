"use client";

import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { RaceMapView } from "@/components/race-map";
import type { RaceMap } from "@/types/feeds";

type RaceView = "list" | "map";

const STORAGE_KEY = "city-hall-watcher:race-view";
let memoryPreference: RaceView = "list";
const listeners = new Set<() => void>();

function savedPreference(): RaceView {
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    return stored === "map" ? "map" : "list";
  } catch {
    return memoryPreference;
  }
}

function savePreference(view: RaceView) {
  memoryPreference = view;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, view);
  } catch {
    // Safari privacy settings and embedded browsers can deny storage. The
    // module-level value still carries the preference across client navigation.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function RaceViewSwitcher({
  map,
  children,
}: {
  map: RaceMap | null;
  children: ReactNode;
}) {
  const view = useSyncExternalStore(subscribe, savedPreference, () => "list");

  if (!map) return children;

  const choose = (next: RaceView) => {
    savePreference(next);
  };

  return (
    <div className="race-view">
      <div className="race-view__switch" role="group" aria-label="Display races as">
        <button
          type="button"
          aria-pressed={view === "list"}
          onClick={() => choose("list")}
        >
          List
        </button>
        <button
          type="button"
          aria-pressed={view === "map"}
          onClick={() => choose("map")}
        >
          Map
        </button>
      </div>
      <div hidden={view !== "list"}>{children}</div>
      <div hidden={view !== "map"}>
        <RaceMapView map={map} />
      </div>
    </div>
  );
}
