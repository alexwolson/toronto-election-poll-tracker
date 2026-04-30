"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Ward } from "@/types/ward";
import { WardCard } from "@/components/ward-card";
import { getWardDisplayName } from "@/lib/ward-names";
import { getVulnerabilityBand } from "@/lib/vulnerability";
import polylabel from "polylabel";

type ViewMode = "grid" | "map";
type BandKey = "high" | "medium" | "low" | "open";

interface GeoFeature {
  wardNum: number;
  paths: string[];
  labelX: number;
  labelY: number;
}

const BAND_ORDER: BandKey[] = ["high", "medium", "low", "open"];

const BAND_LABELS: Record<BandKey, string> = {
  high: "High vulnerability",
  medium: "Moderate vulnerability",
  low: "Low vulnerability",
  open: "Open seat",
};

const BAND_COLORS: Record<BandKey, string> = {
  high: "#fee2e2",
  medium: "#fef3c7",
  low: "#dcfce7",
  open: "#e5e5e5",
};

const BAND_STROKES: Record<BandKey, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
  open: "#999999",
};

const BAND_COLORS_HOVER: Record<BandKey, string> = {
  high: "#fca5a5",
  medium: "#fde68a",
  low: "#86efac",
  open: "#d4d4d4",
};

const BAND_STROKES_HOVER: Record<BandKey, string> = {
  high: "#b91c1c",
  medium: "#b45309",
  low: "#15803d",
  open: "#666666",
};

interface WardsBrowserProps {
  wards: Ward[];
}

const SVG_W = 700;
const SVG_H = 520;
const SVG_PAD = 32;
const ROTATION_DEG = 11.5;

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
  const RAD = (ROTATION_DEG * Math.PI) / 180;
  const cosR = Math.cos(RAD), sinR = Math.sin(RAD);

  // Find geographic bounds
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

  // Preliminary projection scale and rotation center
  const scale0 = Math.min(
    (SVG_W - SVG_PAD * 2) / (maxLon - minLon),
    (SVG_H - SVG_PAD * 2) / (maxLat - minLat),
  );
  const cx = SVG_PAD + ((maxLon - minLon) * scale0) / 2;
  const cy = SVG_H - SVG_PAD - ((maxLat - minLat) * scale0) / 2;

  function preProject([lon, lat]: number[]): [number, number] {
    return [
      SVG_PAD + (lon - minLon) * scale0,
      SVG_H - SVG_PAD - (lat - minLat) * scale0,
    ];
  }

  function rotatePoint([x, y]: [number, number]): [number, number] {
    const dx = x - cx, dy = y - cy;
    return [cx + dx * cosR - dy * sinR, cy + dx * sinR + dy * cosR];
  }

  // Find bounds of all rotated coordinates
  let rMinX = Infinity, rMaxX = -Infinity, rMinY = Infinity, rMaxY = -Infinity;
  for (const feat of geojson.features) {
    for (const polygon of feat.geometry.coordinates) {
      for (const ring of polygon) {
        for (const coord of ring) {
          const [rx, ry] = rotatePoint(preProject(coord));
          if (rx < rMinX) rMinX = rx;
          if (rx > rMaxX) rMaxX = rx;
          if (ry < rMinY) rMinY = ry;
          if (ry > rMaxY) rMaxY = ry;
        }
      }
    }
  }

  // Scale rotated content to fit SVG with centering
  const usableW = SVG_W - SVG_PAD * 2;
  const usableH = SVG_H - SVG_PAD * 2;
  const finalScale = Math.min(usableW / (rMaxX - rMinX), usableH / (rMaxY - rMinY));
  const offX = SVG_PAD + (usableW - (rMaxX - rMinX) * finalScale) / 2;
  const offY = SVG_PAD + (usableH - (rMaxY - rMinY) * finalScale) / 2;

  function finalProject(coord: number[]): [number, number] {
    const [rx, ry] = rotatePoint(preProject(coord));
    return [
      offX + (rx - rMinX) * finalScale,
      offY + (ry - rMinY) * finalScale,
    ];
  }

  return geojson.features.map((feat) => {
    const wardNum = parseInt(feat.properties.AREA_SHORT_CODE, 10);

    // Find the largest polygon by bounding-box area so the label sits
    // over the mainland rather than an island or water body
    let bestPolyIdx = 0;
    let bestArea = -1;
    for (let i = 0; i < feat.geometry.coordinates.length; i++) {
      const outerRing = feat.geometry.coordinates[i][0];
      let pMinX = Infinity, pMaxX = -Infinity, pMinY = Infinity, pMaxY = -Infinity;
      for (const coord of outerRing) {
        const [x, y] = finalProject(coord);
        if (x < pMinX) pMinX = x;
        if (x > pMaxX) pMaxX = x;
        if (y < pMinY) pMinY = y;
        if (y > pMaxY) pMaxY = y;
      }
      const area = (pMaxX - pMinX) * (pMaxY - pMinY);
      if (area > bestArea) { bestArea = area; bestPolyIdx = i; }
    }

    const paths: string[] = [];

    for (const polygon of feat.geometry.coordinates) {
      for (const ring of polygon) {
        const pts = ring.map(finalProject);
        paths.push("M " + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L ") + " Z");
      }
    }

    // Pole of inaccessibility: point furthest from any edge, on the largest polygon
    const bestPolygonRings = feat.geometry.coordinates[bestPolyIdx].map(ring => ring.map(finalProject));
    const [labelX, labelY] = polylabel(bestPolygonRings, 1.0);

    return { wardNum, paths, labelX, labelY };
  });
}

export function WardsBrowser({ wards }: WardsBrowserProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode: ViewMode = searchParams.get("view") === "map" ? "map" : "grid";

  function setMode(m: ViewMode) {
    const params = new URLSearchParams(searchParams.toString());
    if (m === "grid") params.delete("view");
    else params.set("view", m);
    router.replace(`/wards${params.size ? `?${params}` : ""}`, { scroll: false });
  }

  type SortField = "ward" | "vuln" | "name";
  type SortDir = "asc" | "desc";
  const validSortFields: SortField[] = ["ward", "vuln", "name"];
  const rawSort = searchParams.get("sort") ?? "";
  const sortField: SortField = validSortFields.includes(rawSort as SortField) ? (rawSort as SortField) : "ward";
  const sortDir: SortDir = searchParams.get("dir") === "desc" ? "desc" : "asc";

  function handleSortClick(field: SortField) {
    const params = new URLSearchParams(searchParams.toString());
    const newDir: SortDir = field === sortField && sortDir === "asc" ? "desc" : "asc";
    if (field === "ward") params.delete("sort"); else params.set("sort", field);
    if (newDir === "asc") params.delete("dir"); else params.set("dir", newDir);
    router.replace(`/wards${params.size ? `?${params}` : ""}`, { scroll: false });
  }

  const [filter, setFilter] = useState("");
  const [geoFeatures, setGeoFeatures] = useState<GeoFeature[] | null>(null);
  const [hoveredWard, setHoveredWard] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (mode !== "map" || geoFeatures !== null) return;
    fetch("/data/toronto-wards.geojson")
      .then((r) => r.json())
      .then((data) => setGeoFeatures(projectFeatures(data)))
      .catch(() => setGeoFeatures([]));
  }, [mode, geoFeatures]);

  const filteredWards = (filter.trim()
    ? wards.filter((w) => {
        const q = filter.toLowerCase();
        return (
          getWardDisplayName(w.ward).toLowerCase().includes(q) ||
          w.councillor_name.toLowerCase().includes(q) ||
          String(w.ward).includes(q)
        );
      })
    : [...wards]
  ).sort((a, b) => {
    if (sortField === "vuln") {
      const aOpen = a.race_class === "open", bOpen = b.race_class === "open";
      if (aOpen && bOpen) return a.ward - b.ward;
      if (aOpen) return 1;
      if (bOpen) return -1;
      const cmp = a.defeatability_score - b.defeatability_score;
      return sortDir === "asc" ? cmp : -cmp;
    }
    let cmp = 0;
    if (sortField === "ward") cmp = a.ward - b.ward;
    else cmp = getWardDisplayName(a.ward).localeCompare(getWardDisplayName(b.ward));
    return sortDir === "asc" ? cmp : -cmp;
  });

  const wardLookup = Object.fromEntries(wards.map((w) => [w.ward, w]));

  function getBand(ward: Ward | undefined): BandKey {
    if (!ward || ward.race_class === "open") return "open";
    return getVulnerabilityBand(ward.defeatability_score);
  }

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
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "1rem" }}>
            <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginRight: "0.25rem" }}>Sort</span>
            {([["ward", "Ward №"], ["vuln", "Vulnerability"], ["name", "Name"]] as [SortField, string][]).map(([field, label]) => {
              const active = sortField === field;
              return (
                <button
                  key={field}
                  onClick={() => handleSortClick(field)}
                  style={{
                    fontFamily: "var(--font-ibm-mono), monospace",
                    fontSize: "0.6rem",
                    fontWeight: active ? 700 : 400,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    padding: "0.25rem 0.5rem",
                    background: active ? "#1a1a1a" : "transparent",
                    color: active ? "#fff" : "#555",
                    border: "1px solid",
                    borderColor: active ? "#1a1a1a" : "#ccc",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                >
                  {label}
                  {active && <span style={{ fontSize: "0.65rem" }}>{sortDir === "asc" ? "↑" : "↓"}</span>}
                </button>
              );
            })}
          </div>
          <div className="np-ward-grid">
            {filteredWards.map((ward) => (
              <WardCard key={ward.ward} ward={ward} />
            ))}
          </div>
        </>
      )}

      {/* Map mode */}
      {mode === "map" && (
        <div
          style={{
            background: "#faf9f6",
            border: "1px solid #e0ddd8",
            borderRadius: "2px",
            padding: "1rem 1rem 0.75rem",
          }}
        >
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
              <defs>
                <filter id="ward-shadow" x="-8%" y="-8%" width="116%" height="116%">
                  <feDropShadow dx="0" dy="2" stdDeviation="5" floodColor="#000" floodOpacity="0.12" />
                </filter>
                <style>{`
                  .ward-path { transition: fill 0.12s ease, stroke 0.12s ease, stroke-width 0.12s ease; }
                  .ward-g { transition: opacity 0.2s ease; }
                `}</style>
              </defs>
              <g filter="url(#ward-shadow)">
                {geoFeatures.map(({ wardNum, paths, labelX, labelY }) => {
                  const ward = wardLookup[wardNum];
                  const band = getBand(ward);
                  const isFiltered = filter.trim()
                    ? filteredWards.some((w) => w.ward === wardNum)
                    : true;
                  const isHovered = hoveredWard === wardNum;
                  return (
                    <Link key={wardNum} href={`/wards/${wardNum}`}>
                      <g
                        className="ward-g"
                        style={{ cursor: "pointer" }}
                        opacity={isFiltered ? 1 : 0.2}
                        onMouseEnter={(e) => { setHoveredWard(wardNum); setTooltipPos({ x: e.clientX, y: e.clientY }); }}
                        onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                        onMouseLeave={() => { setHoveredWard(null); setTooltipPos(null); }}
                      >
                        {paths.map((d, i) => (
                          <path
                            key={i}
                            className="ward-path"
                            d={d}
                            fill={isHovered ? BAND_COLORS_HOVER[band] : BAND_COLORS[band]}
                            stroke={isHovered ? BAND_STROKES_HOVER[band] : BAND_STROKES[band]}
                            strokeWidth={isHovered ? 2.5 : 1.3}
                          />
                        ))}
                        <text
                          x={labelX}
                          y={labelY + 3}
                          textAnchor="middle"
                          fontSize={10}
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
              </g>
            </svg>
          )}

          {/* Cursor-following tooltip */}
          {hoveredWard !== null && tooltipPos !== null && (() => {
            const ward = wardLookup[hoveredWard];
            const name = getWardDisplayName(hoveredWard);
            const subtitle =
              !ward || ward.race_class === "open" || !ward.is_running
                ? "Open seat"
                : ward.councillor_name;
            return (
              <div
                style={{
                  position: "fixed",
                  left: tooltipPos.x + 14,
                  top: tooltipPos.y - 10,
                  background: "#1a1a1a",
                  color: "#fff",
                  padding: "0.4rem 0.6rem",
                  fontFamily: "var(--font-ibm-mono), monospace",
                  fontSize: "0.65rem",
                  lineHeight: 1.4,
                  pointerEvents: "none",
                  zIndex: 9999,
                  maxWidth: "220px",
                }}
              >
                <div style={{ fontWeight: 700 }}>{name}</div>
                <div style={{ color: "#aaa", marginTop: "0.1rem" }}>{subtitle}</div>
              </div>
            );
          })()}

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
