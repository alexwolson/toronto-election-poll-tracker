import Link from "next/link";
import type { CSSProperties } from "react";
import { formatDate, formatPrintedSharePct, formatSharePct } from "@/lib/format";
import type { StripPoll, StripRow, WardPollStrip as Strip } from "@/lib/ward-poll-strip";

const SUBLABEL: Record<StripRow["kind"], string | null> = {
  candidate: null,
  other: "share of decided voters",
  undecided: "share of everyone asked",
};

function firmClass(firm: string) {
  if (firm.startsWith("Forum")) return "forum";
  if (firm.startsWith("Mainstreet")) return "mainstreet";
  return "other";
}

function markerClass(poll: StripPoll) {
  return `ward-strip__marker ward-strip__marker--${firmClass(poll.firm)}${poll.isNewest ? " ward-strip__marker--newest" : ""}`;
}

// Older polls fade; the opacity sits on the drawn shape so tooltips stay legible.
function markerStyle(poll: StripPoll, left?: string): CSSProperties {
  const opacity = poll.isNewest ? 1 : Math.max(0.55, 1 - poll.age * 0.2);
  return { left, ["--marker-opacity" as string]: opacity };
}

function axisMax(strip: Strip) {
  const values = strip.rows.flatMap((row) => [
    ...row.points.map((p) => p.value),
    row.band?.upper ?? 0,
  ]);
  return Math.max(0.5, Math.ceil(Math.max(...values) * 10) / 10);
}

export function WardPollStrip({
  strip,
  contestCount,
}: {
  strip: Strip;
  contestCount: number | null;
}) {
  const max = axisMax(strip);
  const at = (value: number) => `${(Math.min(value, max) / max) * 100}%`;
  const polls = new Map(strip.polls.map((p) => [p.pollId, p]));
  const ticks = Array.from({ length: Math.round(max * 10) + 1 }, (_, i) => i / 10);
  const showBands = contestCount !== null && strip.rows.some((r) => r.band);
  const rescaled = [
    ...new Set(
      strip.rows
        .filter((row) => row.kind !== "undecided")
        .flatMap((row) => row.points)
        .filter((p) => p.value !== p.printed)
        .map((p) => polls.get(p.pollId)!.firm),
    ),
  ];
  return (
    <figure className="ward-strip" aria-label="Every poll for this ward, by candidate">
      {showBands && strip.leadSentence && (
        <p className="ward-strip__headline">{strip.leadSentence}</p>
      )}
      <ul className="ward-strip__legend">
        {[...strip.polls].reverse().map((poll) => (
          <li key={poll.pollId}>
            <span
              className={markerClass(poll)}
              style={markerStyle(poll)}
              aria-hidden="true"
            />
            {poll.firm} · {formatDate(poll.dateConducted)}
            {poll.sampleSize !== null && <> · {poll.sampleSize} asked</>}
            {poll.isNewest && strip.polls.length > 1 && <> · newest</>}
          </li>
        ))}
        {showBands && (
          <li>
            <span className="ward-strip__swatch" aria-hidden="true" />
            Likely range for the newest poll
          </li>
        )}
      </ul>
      <div className="ward-strip__chart">
        <div className="ward-strip__axis" aria-hidden="true">
          <span />
          <span className="ward-strip__axis-track">
            {ticks.map((t) => (
              <span key={t} style={{ left: at(t) }}>
                {Math.round(t * 100)}%
              </span>
            ))}
          </span>
          <span />
        </div>
        <ol className="ward-strip__rows">
          {strip.rows.map((row) => (
            <li
              key={row.key}
              className={`ward-strip__row ward-strip__row--${row.kind}`}
            >
              <span className="ward-strip__name">
                {row.name}
                {row.isIncumbent && (
                  <span className="candidate-row__tag">incumbent</span>
                )}
                {SUBLABEL[row.kind] && (
                  <span className="ward-strip__sub">{SUBLABEL[row.kind]}</span>
                )}
              </span>
              <span className="ward-strip__plot">
                {showBands && row.band && (
                  <span
                    className="ward-strip__band"
                    style={{
                      left: at(row.band.lower),
                      width: `calc(${at(row.band.upper)} - ${at(row.band.lower)})`,
                    }}
                    aria-hidden="true"
                  />
                )}
                {row.points.map((point) => {
                  const poll = polls.get(point.pollId)!;
                  const base =
                    row.kind === "undecided" ? "of everyone asked" : "of decided voters";
                  const printed =
                    point.value !== point.printed
                      ? ` (${formatPrintedSharePct(point.printed)} as printed)`
                      : "";
                  const label = `${row.name}: ${formatSharePct(point.value)} ${base}${printed}. ${poll.firm}, ${formatDate(poll.dateConducted)}.`;
                  return (
                    <button
                      type="button"
                      key={point.pollId}
                      className={markerClass(poll)}
                      style={markerStyle(poll, at(point.value))}
                      aria-label={label}
                      data-tip={label}
                    />
                  );
                })}
              </span>
              {row.latest !== null ? (
                <span className="ward-strip__value">
                  {formatSharePct(row.latest)}
                </span>
              ) : (
                <span className="ward-strip__value ward-strip__value--note">
                  {row.latestNote}
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
      <figcaption className="ward-strip__note">
        {showBands && (
          <>
            Shaded bars show where the newest poll’s numbers could land. In past
            ward races, about {Math.round((strip.intervalMass ?? 0.8) * 10)} results
            in 10 fell inside ranges this wide. Small samples and just{" "}
            {contestCount} historical ward races from one election cannot establish
            reliable win odds.{" "}
          </>
        )}
        {rescaled.length > 0 && (
          <>
            {rescaled.join(" and ")}{" "}
            {rescaled.length === 1
              ? "counts undecided voters in its results, so its numbers are"
              : "count undecided voters in their results, so their numbers are"}{" "}
            rescaled to decided voters to compare with other polls.{" "}
          </>
        )}
        <Link href="/how-it-works/#ward-polls">How to read this chart</Link>.
      </figcaption>
    </figure>
  );
}
