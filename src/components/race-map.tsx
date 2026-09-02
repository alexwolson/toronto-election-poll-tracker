"use client";

import Link from "next/link";
import type { CSSProperties, KeyboardEvent } from "react";
import { useRef, useState } from "react";
import type { RaceMap, RaceMapFeature } from "@/types/feeds";

type MapStyle = CSSProperties & { "--race-map-share"?: string };

function shareStyle(feature: RaceMapFeature): MapStyle | undefined {
  if (feature.signal_key !== "prior_winner_share" || feature.signal_value === null) return undefined;
  const normalized = Math.max(0, Math.min(100, feature.signal_value * 100));
  return { "--race-map-share": `${normalized}%` };
}

function geographyParts(geography: string): string[] {
  return geography.split(";").map((part) => part.trim()).filter(Boolean);
}

function incumbentSummaryValue(summary: string): string {
  return summary.replace(/^Incumbents?:\s*/i, "");
}

function navigatedFeature(
  features: RaceMapFeature[],
  current: RaceMapFeature,
  key: string,
): RaceMapFeature | null {
  const byWard = [...features].sort((a, b) =>
    a.ward_id.localeCompare(b.ward_id, undefined, { numeric: true }),
  );
  if (key === "Home") return byWard[0];
  if (key === "End") return byWard[byWard.length - 1];

  const horizontal = key === "ArrowLeft" || key === "ArrowRight";
  const direction = key === "ArrowLeft" || key === "ArrowUp" ? -1 : 1;
  if (!horizontal && key !== "ArrowUp" && key !== "ArrowDown") return null;

  return features
    .filter((feature) => {
      const primaryDelta = horizontal
        ? feature.label.x - current.label.x
        : feature.label.y - current.label.y;
      return primaryDelta * direction > 0;
    })
    .sort((a, b) => {
      const score = (feature: RaceMapFeature) => {
        const dx = feature.label.x - current.label.x;
        const dy = feature.label.y - current.label.y;
        return horizontal ? Math.hypot(dx, dy * 2) : Math.hypot(dx * 2, dy);
      };
      return score(a) - score(b);
    })[0] ?? null;
}

export function RaceMapView({ map }: { map: RaceMap }) {
  const [heldWard, setHeldWard] = useState(map.features[0].ward_id);
  const [previewWard, setPreviewWard] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const featureRefs = useRef<Record<string, SVGPathElement | null>>({});
  const activeWard = previewWard ?? heldWard;
  const active = map.features.find((feature) => feature.ward_id === activeWard) ?? map.features[0];
  const areas = geographyParts(active.panel.geography);
  const normalizedHeading = active.panel.heading.toLocaleLowerCase();
  const showAreas =
    areas.length > 0 &&
    !areas.every((area) => normalizedHeading.includes(area.toLocaleLowerCase()));
  const showStatus = active.panel.status !== "Contested race";
  const showIncumbentFact = active.signal_key !== "open";

  const hold = (feature: RaceMapFeature) => {
    setHeldWard(feature.ward_id);
    setAnnouncement(`${feature.accessible_name} selected`);
  };

  const keySelect = (event: KeyboardEvent<SVGPathElement>, feature: RaceMapFeature) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      hold(feature);
      return;
    }

    const nextFeature = navigatedFeature(map.features, feature, event.key);
    if (!nextFeature) return;
    event.preventDefault();
    hold(nextFeature);
    featureRefs.current[nextFeature.ward_id]?.focus();
  };

  return (
    <div className={`race-map-layout race-map-layout--${map.palette}`}>
      <div className="race-map-stage">
        <p className="race-map-instruction">
          Select a ward on the map, or switch to list view for larger targets.
          Keyboard users can move between wards with the arrow keys.
        </p>
        <svg viewBox={map.view_box} role="img" aria-label={map.aria_label}>
          <g className="race-map-hit-areas" aria-hidden="true">
            {map.features.map((feature) => (
              <path
                key={`${feature.ward_id}-hit-area`}
                d={feature.path}
                className="race-map-hit-area"
                focusable="false"
                onMouseEnter={() => setPreviewWard(feature.ward_id)}
                onMouseLeave={() => setPreviewWard(null)}
                onClick={() => hold(feature)}
              />
            ))}
          </g>
          <g className="race-map-features">
            {map.features.map((feature) => (
              <path
                key={feature.ward_id}
                ref={(element) => {
                  featureRefs.current[feature.ward_id] = element;
                }}
                d={feature.path}
                className={`race-map-feature race-map-feature--${feature.signal_key}${feature.ward_id === heldWard ? " is-held" : ""}${feature.ward_id === activeWard ? " is-active" : ""}`}
                style={shareStyle(feature)}
                role="button"
                tabIndex={feature.ward_id === heldWard ? 0 : -1}
                aria-label={feature.accessible_name}
                aria-pressed={feature.ward_id === heldWard}
                onMouseEnter={() => setPreviewWard(feature.ward_id)}
                onMouseLeave={() => setPreviewWard(null)}
                onFocus={() => setPreviewWard(feature.ward_id)}
                onBlur={() => setPreviewWard(null)}
                onClick={() => hold(feature)}
                onKeyDown={(event) => keySelect(event, feature)}
              />
            ))}
          </g>
          <g className="race-map-labels" aria-hidden="true">
            {map.features.map((feature) => feature.label.leader_line && (
              <line
                key={`${feature.ward_id}-leader`}
                x1={feature.label.leader_line.x1}
                y1={feature.label.leader_line.y1}
                x2={feature.label.leader_line.x2}
                y2={feature.label.leader_line.y2}
              />
            ))}
            {map.features.map((feature) => (
              <text key={feature.ward_id} x={feature.label.x} y={feature.label.y}>
                {feature.label.text}
              </text>
            ))}
          </g>
        </svg>
        <div className="race-map-legend" aria-label="Map legend">
          {map.legend.map((entry) => (
            <div key={entry.key} className="race-map-legend__item">
              <span className={`race-map-legend__swatch race-map-feature--${entry.key}`} />
              <span>
                <strong>{entry.label}</strong>
                {entry.description && <small>{entry.description}</small>}
              </span>
            </div>
          ))}
        </div>
      </div>

      <aside className="race-map-panel">
        <h3>{active.panel.heading}</h3>
        {showStatus && (
          <span className={`race-map-panel__status race-map-feature--${active.signal_key}`}>
            {active.panel.status}
          </span>
        )}
        {active.signal_key === "prior_winner_share" && active.signal_value !== null && (
          <p className="race-map-panel__share">
            Previous winner: {(active.signal_value * 100).toFixed(1)}% of votes cast
          </p>
        )}
        {showAreas && (
          <div className="race-map-panel__areas">
            <p>Areas covered</p>
            <ul>
              {areas.map((area) => (
                <li key={area}>{area}</li>
              ))}
            </ul>
          </div>
        )}
        <dl className="race-map-panel__facts">
          <div>
            <dt>Candidates</dt>
            <dd>{active.panel.candidate_count}</dd>
          </div>
          {showIncumbentFact && (
            <div>
              <dt>Incumbent status</dt>
              <dd>{incumbentSummaryValue(active.panel.incumbent_summary)}</dd>
            </div>
          )}
        </dl>
        <Link className="race-map-panel__link" href={active.panel.href}>
          View race details <span aria-hidden="true">→</span>
        </Link>
      </aside>
      <span className="sr-only" aria-live="polite">{announcement}</span>
    </div>
  );
}
