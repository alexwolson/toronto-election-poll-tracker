"use client";

import { useState } from "react";
import Link from "next/link";
import { Ward } from "@/types/ward";
import { WardCard } from "@/components/ward-card";
import { getWardDisplayName } from "@/lib/ward-names";
import { getVulnerabilityBand } from "@/lib/vulnerability";

type ViewMode = "grid" | "map" | "columns";

type VulnerabilityBandKey = "low" | "medium" | "high";

const BAND_ORDER: VulnerabilityBandKey[] = ["high", "medium", "low"];

const BAND_LABELS: Record<VulnerabilityBandKey, string> = {
  high: "High vulnerability",
  medium: "Moderate vulnerability",
  low: "Low vulnerability",
};

const BAND_COLORS: Record<VulnerabilityBandKey, string> = {
  high: "#fee2e2",
  medium: "#fef3c7",
  low: "#dcfce7",
};

const BAND_STROKES: Record<VulnerabilityBandKey, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
};

interface WardsBrowserProps {
  wards: Ward[];
}

export function WardsBrowser({ wards }: WardsBrowserProps) {
  const [mode, setMode] = useState<ViewMode>("grid");
  const [filter, setFilter] = useState("");

  const filteredWards = filter.trim()
    ? wards.filter((w) => {
        const q = filter.toLowerCase();
        return (
          getWardDisplayName(w.ward).toLowerCase().includes(q) ||
          w.councillor_name.toLowerCase().includes(q) ||
          String(w.ward).includes(q)
        );
      })
    : wards;

  const wardsByBand: Record<VulnerabilityBandKey, Ward[]> = {
    high: [],
    medium: [],
    low: [],
  };
  for (const ward of filteredWards) {
    const band = getVulnerabilityBand(ward.defeatability_score);
    wardsByBand[band].push(ward);
  }

  return (
    <div>
      {/* Mode tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #ccc", marginBottom: "1rem" }}>
        {(["grid", "map", "columns"] as ViewMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              fontFamily: "var(--font-ibm-mono), monospace",
              fontSize: "0.62rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              padding: "0.4rem 1rem",
              background: mode === m ? "#1a1a1a" : "transparent",
              color: mode === m ? "#fff" : "#555",
              borderTop: "none",
              borderLeft: "none",
              borderBottom: "none",
              borderRight: "1px solid #ccc",
              cursor: "pointer",
            }}
          >
            {m === "grid" ? "Grid" : m === "map" ? "Map" : "Vulnerability"}
          </button>
        ))}
      </div>

      {/* Filter input */}
      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Filter wards…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            fontFamily: "var(--font-ibm-mono), monospace",
            fontSize: "0.7rem",
            padding: "0.35rem 0.6rem",
            border: "1px solid #ccc",
            background: "#faf9f6",
            width: "220px",
            outline: "none",
          }}
        />
      </div>

      {/* Grid mode */}
      {mode === "grid" && (
        <div className="np-ward-grid">
          {filteredWards.map((ward) => (
            <WardCard key={ward.ward} ward={ward} />
          ))}
        </div>
      )}

      {/* Map mode */}
      {mode === "map" && (
        <div style={{ border: "1px solid #ccc", padding: "0.75rem" }}>
          <svg
            viewBox="0 0 600 500"
            className="w-full h-auto"
            style={{ border: "1px solid #ccc" }}
          >
            {/* Simple grid-based ward placeholders */}
            {filteredWards.map((ward, i) => {
              const band = getVulnerabilityBand(ward.defeatability_score);
              const col = i % 5;
              const row = Math.floor(i / 5);
              const x = col * 110 + 10;
              const y = row * 90 + 10;
              return (
                <g key={ward.ward}>
                  <rect
                    x={x}
                    y={y}
                    width={100}
                    height={80}
                    fill={BAND_COLORS[band]}
                    stroke={BAND_STROKES[band]}
                    strokeWidth={1}
                  />
                  <text
                    x={x + 50}
                    y={y + 30}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="bold"
                    fill="#1a1a1a"
                  >
                    {String(ward.ward).padStart(2, "0")}
                  </text>
                  <text
                    x={x + 50}
                    y={y + 48}
                    textAnchor="middle"
                    fontSize="7"
                    fill="#555"
                  >
                    {getWardDisplayName(ward.ward).length > 14
                      ? getWardDisplayName(ward.ward).slice(0, 13) + "…"
                      : getWardDisplayName(ward.ward)}
                  </text>
                </g>
              );
            })}
          </svg>
          {/* Legend */}
          <div
            style={{
              marginTop: "0.75rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              fontFamily: "var(--font-ibm-mono), monospace",
              fontSize: "0.6rem",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#555",
            }}
          >
            {BAND_ORDER.map((band) => (
              <span key={band} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <span
                  style={{
                    display: "inline-block",
                    width: "12px",
                    height: "12px",
                    backgroundColor: BAND_COLORS[band],
                    border: `1px solid ${BAND_STROKES[band]}`,
                  }}
                />
                {BAND_LABELS[band]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Columns (vulnerability) mode */}
      {mode === "columns" && (
        <div
          style={{
            display: "grid",
            gap: "0",
            gridTemplateColumns: "repeat(3, 1fr)",
            border: "1px solid #ccc",
            borderRight: "none",
          }}
        >
          {BAND_ORDER.map((band) => (
            <div key={band} style={{ borderRight: "1px solid #ccc", padding: "1rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  borderBottom: "1px solid #ccc",
                  paddingBottom: "0.5rem",
                  marginBottom: "0.75rem",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-newsreader), serif",
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    color: "#1a1a1a",
                  }}
                >
                  {BAND_LABELS[band]}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-ibm-mono), monospace",
                    fontSize: "0.6rem",
                    color: "#888",
                    textTransform: "uppercase",
                  }}
                >
                  {wardsByBand[band].length}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                {wardsByBand[band].map((ward) => (
                  <Link
                    key={ward.ward}
                    href={`/wards/${ward.ward}`}
                    style={{
                      display: "block",
                      padding: "0.4rem 0.5rem",
                      borderBottom: "1px solid #e8e5e0",
                      textDecoration: "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        gap: "0.5rem",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-newsreader), serif",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          color: "#1a1a1a",
                        }}
                      >
                        {getWardDisplayName(ward.ward)}
                      </span>
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-ibm-mono), monospace",
                        fontSize: "0.58rem",
                        color: "#888",
                        marginTop: "0.1rem",
                      }}
                    >
                      {ward.is_running ? ward.councillor_name : "Open seat"}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
