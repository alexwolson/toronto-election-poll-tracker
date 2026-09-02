"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AttentionLevel, WardIndexItem } from "@/lib/council";

const ATTENTION_LABEL: Record<AttentionLevel, string> = {
  high: "High attention",
  elevated: "Elevated attention",
  quiet: "Quiet race",
  open: "Open seat",
};

type Sort = "attention" | "ward";

export function WardsBrowser({ items }: { items: WardIndexItem[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("attention");
  const isFiltering = query.trim().length > 0;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? items.filter(
          (w) =>
            w.name.toLowerCase().includes(q) ||
            w.ward.includes(q) ||
            (w.incumbentName?.toLowerCase().includes(q) ?? false),
        )
      : items;
    const sorted = [...filtered];
    if (sort === "ward") {
      sorted.sort((a, b) => a.wardNum - b.wardNum);
    } else {
      sorted.sort((a, b) => b.score - a.score || a.wardNum - b.wardNum);
    }
    return sorted;
  }, [items, query, sort]);

  return (
    <div>
      <div className="ward-index-controls">
        <label className="ward-search-label" htmlFor="ward-search">
          <span>Find a ward</span>
          <input
            id="ward-search"
            className="ward-search-input"
            type="search"
            placeholder="Ward, neighbourhood, or councillor"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="ward-index-sort" role="group" aria-label="Order wards">
          <button
            type="button"
            aria-pressed={sort === "attention"}
            onClick={() => setSort("attention")}
          >
            By attention
          </button>
          <button
            type="button"
            aria-pressed={sort === "ward"}
            onClick={() => setSort("ward")}
          >
            By ward number
          </button>
        </div>
        <span
          className={`ward-index-count font-mono${isFiltering ? "" : " sr-only"}`}
          aria-live="polite"
        >
          {shown.length} of {items.length} wards shown
        </span>
      </div>

      {shown.length > 0 ? (
        <ul className="race-index-list ward-index-grid">
          {shown.map((w) => (
            <li key={w.ward}>
              <Link
                href={`/wards/${w.ward}`}
                className={`race-index-card ward-index-card ward-index-card--${w.attention}`}
              >
                <span className="race-index-card__eyebrow ward-index-card__ward">
                  Ward {w.ward}
                </span>
                <h3 className="race-index-card__heading ward-index-card__name">
                  {w.name}
                </h3>
                {!w.isOpen && (
                  <p className="ward-index-card__incumbent">{w.incumbentName}</p>
                )}
                <span
                  className={`race-index-tag ward-attn-tag ward-attn-tag--${w.attention}`}
                >
                  {ATTENTION_LABEL[w.attention]}
                </span>
                {w.triggers.length > 0 && (
                  <ul className="trigger-list">
                    {w.triggers.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ward-search-empty" role="status">
          No wards match &ldquo;{query.trim()}&rdquo;. Try a ward number,
          neighbourhood, or councillor name.
        </p>
      )}
    </div>
  );
}
