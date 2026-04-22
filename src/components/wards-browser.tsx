"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Ward } from "@/types/ward";
import { WardCard } from "@/components/ward-card";
import { getWardDisplayName } from "@/lib/ward-names";
import { getVulnerabilityBand } from "@/lib/vulnerability";

type ViewMode = "grid" | "map";

type VulnerabilityBandKey = "low" | "medium" | "high";

interface GeoFeature {
  wardNum: number;
  paths: string[];
  labelX: number;
  labelY: number;
}

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

const SVG_W = 700;
const SVG_H = 520;
const SVG_PAD = 16;

type RawRing = number[][];
type RawPolygon = RawRing[];
type RawMultiPolygon = RawPolygon[];

interface RawFeature {
  properties: Record<string, string>;
  geometry: { type: string; coordinates: RawMultiPolygon };
}

interface RawGeoJSON {
  features: RawFeature[];
}

function projectFeatures(geojson: RawGeoJSON): GeoFeature[] {
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const feat of geojson.features) {
    for (const polygon of feat.geometry.coordinates) {
      for (const ring of polygon) {
        for (const [lon, lat] of ring) {
          if (lon < minLon) minLon = lon;
          if (lon > maxLon) maxLon = lon;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
      }
    }
  }

  const scaleX = (SVG_W - SVG_PAD * 2) / (maxLon - minLon);
  const scaleY = (SVG_H - SVG_PAD * 2) / (maxLat - minLat);
  const scale = Math.min(scaleX, scaleY);

  function project([lon, lat]: number[]): [number, number] {
    return [
      SVG_PAD + (lon - minLon) * scale,
      SVG_H - SVG_PAD - (lat - minLat) * scale,
    ];
  }

  return geojson.features.map((feat) => {
    const wardNum = parseInt(feat.properties.AREA_SHORT_CODE, 10);
    const paths: string[] = [];
    let sumX = 0, sumY = 0, ptCount = 0;

    for (const polygon of feat.geometry.coordinates) {
      for (const ring of polygon) {
        const pts = ring.map(project);
        paths.push("M " + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L ") + " Z");
        if (ring === polygon[0]) {
          for (const [x, y] of pts) { sumX += x; sumY += y; ptCount++; }
        }
      }
    }

    return {
      wardNum,
      paths,
      labelX: ptCount > 0 ? sumX / ptCount : 0,
      labelY: ptCount > 0 ? sumY / ptCount : 0,
    };
  });
}

export function WardsBrowser({ wards }: WardsBrowserProps) {
  const [mode, setMode] = useState<ViewMode>("grid");
  const [filter, setFilter] = useState("");
  const [geoFeatures, setGeoFeatures] = useState<GeoFeature[] | null>(null);

  useEffect(() => {
    if (mode !== "map" || geoFeatures !== null) return;
    fetch("/data/toronto-wards.geojson")
      .then((r) => r.json())
      .then((data) => setGeoFeatures(projectFeatures(data)))
      .catch(() => setGeoFeatures([]));
  }, [mode, geoFeatures]);

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

  const wardLookup = Object.fromEntries(wards.map((w) => [w.ward, w]));

  return (
    <div>
      {/* Mode tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #ccc", marginBottom: "1rem" }}>
        {(["grid", "map"] as ViewMode[]).map((m) => (
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
            {m === "grid" ? "Grid" : "Map"}
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
          {!geoFeatures ? (
            <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", color: "#888", padding: "2rem", textAlign: "center" }}>
              Loading map…
            </div>
          ) : geoFeatures.length === 0 ? (
            <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", color: "#888", padding: "2rem", textAlign: "center" }}>
              Map data unavailable.
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              style={{ display: "block", width: "100%", height: "auto" }}
            >
              {geoFeatures.map(({ wardNum, paths, labelX, labelY }) => {
                const ward = wardLookup[wardNum];
                const band = ward ? getVulnerabilityBand(ward.defeatability_score) : "low";
                const isFiltered = filter.trim()
                  ? filteredWards.some((w) => w.ward === wardNum)
                  : true;
                return (
                  <Link key={wardNum} href={`/wards/${wardNum}`}>
                    <g style={{ cursor: "pointer" }} opacity={isFiltered ? 1 : 0.25}>
                      {paths.map((d, i) => (
                        <path
                          key={i}
                          d={d}
                          fill={BAND_COLORS[band]}
                          stroke={BAND_STROKES[band]}
                          strokeWidth={0.8}
                        />
                      ))}
                      <text
                        x={labelX}
                        y={labelY + 3}
                        textAnchor="middle"
                        fontSize={9}
                        fontWeight={700}
                        fill="#1a1a1a"
                        style={{ pointerEvents: "none" }}
                      >
                        {String(wardNum).padStart(2, "0")}
                      </text>
                    </g>
                  </Link>
                );
              })}
            </svg>
          )}
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

    </div>
  );
}
