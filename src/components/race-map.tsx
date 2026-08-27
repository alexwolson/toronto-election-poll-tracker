"use client";

import Link from "next/link";
import type { CSSProperties, KeyboardEvent } from "react";
import { useState } from "react";
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

export function RaceMapView({ map }: { map: RaceMap }) {
  const [heldWard, setHeldWard] = useState(map.features[0].ward_id);
  const [previewWard, setPreviewWard] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const activeWard = previewWard ?? heldWard;
  const active = map.features.find((feature) => feature.ward_id === activeWard) ?? map.features[0];

  const hold = (feature: RaceMapFeature) => {
    setHeldWard(feature.ward_id);
    setAnnouncement(`${feature.accessible_name} selected`);
  };

  const keySelect = (event: KeyboardEvent<SVGPathElement>, feature: RaceMapFeature) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    hold(feature);
  };

  return (
    <div className={`race-map-layout race-map-layout--${map.palette}`}>
      <div className="race-map-stage">
        <svg viewBox={map.view_box} role="img" aria-label={map.aria_label}>
          <g className="race-map-features">
            {map.features.map((feature) => (
              <path
                key={feature.ward_id}
                d={feature.path}
                className={`race-map-feature race-map-feature--${feature.signal_key}${feature.ward_id === heldWard ? " is-held" : ""}${feature.ward_id === activeWard ? " is-active" : ""}`}
                style={shareStyle(feature)}
                role="button"
                tabIndex={0}
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
        <p className="np-kicker">Selected race</p>
        <h3>{active.panel.heading}</h3>
        <span className={`race-map-panel__status race-map-feature--${active.signal_key}`}>
          {active.panel.status}
        </span>
        {active.signal_key === "prior_winner_share" && active.signal_value !== null && (
          <p className="race-map-panel__share">
            Prior winner: {(active.signal_value * 100).toFixed(1)}% of votes cast
          </p>
        )}
        <div className="race-map-panel__areas">
          <p>Areas covered</p>
          <ul>
            {geographyParts(active.panel.geography).map((area) => (
              <li key={area}>{area}</li>
            ))}
          </ul>
        </div>
        <dl className="race-map-panel__facts">
          <div>
            <dt>Field</dt>
            <dd>{active.panel.candidate_count} candidate{active.panel.candidate_count === 1 ? "" : "s"}</dd>
          </div>
          <div>
            <dt>Incumbency</dt>
            <dd>{active.panel.incumbent_summary}</dd>
          </div>
        </dl>
        <Link className="race-map-panel__link" href={active.panel.href}>
          View race <span aria-hidden="true">→</span>
        </Link>
      </aside>
      <span className="sr-only" aria-live="polite">{announcement}</span>
    </div>
  );
}
