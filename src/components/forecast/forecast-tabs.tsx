"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export interface ForecastTab {
  id: string;
  label: string;
  content: ReactNode;
}

/**
 * Two or more views of the same simulated elections beneath the margin chart,
 * one visible at a time. Real tabs: roving focus, arrow keys, Home and End,
 * every panel present in the static markup and hidden with the `hidden`
 * attribute, so the first view reads without JavaScript and the rest are one
 * keypress away with it.
 */
export function ForecastTabs({ tabs, label }: { tabs: ForecastTab[]; label: string }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const base = useId();
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  if (tabs.length === 0) return null;

  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    setActive(tabs[next].id);
    buttons.current[next]?.focus();
  };

  return (
    <div className="forecast-tabs">
      <div className="forecast-tabs__list" role="tablist" aria-label={label}>
        {tabs.map((tab, index) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={(element) => {
                buttons.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${tab.id}`}
              className="forecast-tabs__tab"
              aria-selected={selected}
              aria-controls={`${base}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(event) => move(event, index)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${base}-panel-${tab.id}`}
          className="forecast-tabs__panel"
          aria-labelledby={`${base}-tab-${tab.id}`}
          hidden={tab.id !== active}
          tabIndex={0}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
