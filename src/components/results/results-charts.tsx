"use client";

/**
 * The approved prototype's charts that the first port had swapped out (Alex, 2026-10-24): the
 * projected finish of the top two over the night, the mayor's share by ward as small maps, each
 * poll as a card with its bars, and the mayor's race in a ward as bars. Drawn from the payload and
 * the night's history only.
 */

import Link from "next/link";
import { CHOW_2023 } from "@/lib/chow-2023";
import { figureColour, liveColour } from "@/lib/live-colour";
import { shortLabel } from "@/lib/live-labels";
import { rangeText, shareText } from "@/lib/live-share";
import type { ResultsMapWard } from "@/lib/results-map-data";
import type { WardPoll } from "@/types/feeds";
import type { LiveCandidate, LiveHistory, LiveRace } from "@/types/live";
import { clockTime } from "./results-status";

type Band = [number, number, number];

/** The race's two leaders and every update at which the history holds both their bands; null when none. */
export function topTwoBands(race: LiveRace, history: LiveHistory | null): { a: LiveCandidate; b: LiveCandidate; pts: { t: number; a: Band; b: Band }[] } | null {
  const h = history?.races[race.id];
  const [a, b] = [...race.candidates].sort((x, y) => (y.votes ?? 0) - (x.votes ?? 0));
  if (!history || !h?.b || !a || !b) return null;
  const ia = h.keys.indexOf(a.key), ib = h.keys.indexOf(b.key);
  const pts = history.t
    .map((t, i) => ({ t, a: h.b![i]?.[ia] ?? null, b: h.b![i]?.[ib] ?? null }))
    .filter((p): p is { t: number; a: Band; b: Band } => !!p.a && !!p.b);
  return pts.length ? { a, b, pts } : null;
}

/** Each leader's estimated final share at every City update: the band and its middle, one colour
 *  each, labelled at the end. Nothing when the history holds no band for both. */
export function EstimateBands({ race, history }: { race: LiveRace; history: LiveHistory | null }) {
  const top = topTwoBands(race, history);
  if (!top) return null;
  const { a, b, pts } = top;
  const W = 760, H = 300, m = { t: 16, r: 150, b: 30, l: 40 };
  const all = pts.flatMap((p) => [p.a[0], p.a[2], p.b[0], p.b[2]]);
  const lo = Math.max(0, Math.floor((Math.min(...all) - 1) / 5) * 5), hi = Math.ceil((Math.max(...all) + 1) / 5) * 5;
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t;
  const x = (t: number) => m.l + ((t - t0) / Math.max(1, t1 - t0)) * (W - m.l - m.r);
  const y = (v: number) => m.t + (1 - (v - lo) / (hi - lo)) * (H - m.t - m.b);
  const series = [
    { c: b, band: (p: (typeof pts)[number]) => p.b },
    { c: a, band: (p: (typeof pts)[number]) => p.a },
  ];
  const end = pts[pts.length - 1];
  // End labels, pushed apart so they never collide.
  const labels = series.map((s) => ({ c: s.c, y: y(s.band(end)[1]), band: s.band(end) })).sort((p, q) => p.y - q.y);
  if (labels[1].y - labels[0].y < 40) {
    const mid = (labels[0].y + labels[1].y) / 2;
    labels[0].y = mid - 20;
    labels[1].y = mid + 20;
  }
  const ticks = Array.from({ length: (hi - lo) / 5 + 1 }, (_, i) => lo + i * 5);
  return (
    <svg className="results-bands" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Estimated final share over the night: ${a.full_name} ${shareText(end.a[1])}, ${b.full_name} ${shareText(end.b[1])}`}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} stroke="var(--rule-soft)" />
          <text x={m.l - 6} y={y(v) + 4} textAnchor="end" fontSize={12} fill="var(--muted)">{`${v}%`}</text>
        </g>
      ))}
      {[t0, (t0 + t1) / 2, t1].map((t, j) => (
        <text key={j} x={x(t)} y={H - 8} textAnchor={j === 0 ? "start" : j === 2 ? "end" : "middle"} fontSize={12} fill="var(--muted)">{clockTime(t)}</text>
      ))}
      {series.map(({ c, band }) => {
        const colour = liveColour(c, "var(--color-disengaged)");
        const area = pts.map((p) => `${x(p.t)},${y(band(p)[2])}`).concat([...pts].reverse().map((p) => `${x(p.t)},${y(band(p)[0])}`));
        return (
          <g key={c.key}>
            <polygon points={area.join(" ")} fill={colour} fillOpacity={0.18} />
            <polyline points={pts.map((p) => `${x(p.t)},${y(band(p)[1])}`).join(" ")} fill="none" stroke={colour} strokeWidth={2.5} strokeLinejoin="round" />
            <circle cx={x(end.t)} cy={y(band(end)[1])} r={4} fill={colour} />
          </g>
        );
      })}
      {labels.map((l) => (
        <g key={l.c.key}>
          <text x={W - m.r + 12} y={l.y - 2} fontSize={14} fontWeight={700} fill={figureColour(liveColour(l.c, "var(--color-disengaged)"))}>{`${shortLabel(l.c)} ${shareText(l.band[1])}`}</text>
          <text x={W - m.r + 12} y={l.y + 14} fontSize={12} fill="var(--muted)">{rangeText(l.band[0], l.band[2])}</text>
        </g>
      ))}
    </svg>
  );
}

/** Where each of the mayor's top four is strongest: one small map each, every ward shaded by that
 *  candidate's share of its vote against their best ward. */
export function ShareMultiples({ race, wards, viewBox }: { race: LiveRace; wards: ResultsMapWard[]; viewBox: string }) {
  const counted = (race.wards ?? []).filter((w) => w.votes && w.votes_counted);
  if (counted.length === 0) return null;
  const top = [...race.candidates].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0)).slice(0, 4);
  return (
    <div className="results-multiples">
      {top.map((c) => {
        const share = new Map(counted.map((w) => [w.num, (100 * (w.votes![c.key] ?? 0)) / w.votes_counted!]));
        const best = [...share.entries()].sort((p, q) => q[1] - p[1])[0];
        const max = Math.max(best?.[1] ?? 0, 1);
        const colour = liveColour(c, "var(--color-disengaged)");
        return (
          <figure key={c.key} className="results-multiples__one">
            <figcaption>
              <h3>{c.full_name}</h3>
              {best && <p>{`Strongest in Ward ${best[0]} (${shareText(best[1])})`}</p>}
            </figcaption>
            <svg viewBox={viewBox} role="img" aria-label={`${c.full_name}'s share by ward`}>
              {wards.map((w) => {
                const s = share.get(w.num);
                return <path key={w.num} d={w.path} fill={s === undefined ? "var(--rule-soft)" : `color-mix(in srgb, ${colour} ${Math.round(8 + 92 * (s / max))}%, #fff)`} />;
              })}
            </svg>
          </figure>
        );
      })}
    </div>
  );
}

const POLL_DATE = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", timeZone: "UTC" });

/** Each poll as a card (the prototype's): who and when, the sample, its five largest shares as
 *  bars, and the undecided. */
export function RacePolls({ polls }: { polls: WardPoll[] }) {
  const ordered = [...polls].sort((a, b) => (a.date_conducted < b.date_conducted ? 1 : -1));
  return (
    <div className="race-polls">
      {ordered.map((q) => {
        const shares = q.candidates.filter((c) => !c.is_residual).map((c) => ({ name: c.candidate_name, share: 100 * c.share })).sort((a, b) => b.share - a.share).slice(0, 5);
        const scale = Math.max(50, (shares[0]?.share ?? 0) + 5);
        const meta = [q.sample_size ? `${q.sample_size.toLocaleString("en-CA")} respondents` : null, q.methodology || null].filter(Boolean).join(" · ");
        return (
          <div key={q.poll_id} className="race-poll">
            <p className="race-poll__name">{`${q.firm}, ${POLL_DATE.format(new Date(`${q.date_conducted}T12:00Z`))}`}</p>
            {meta && <p className="results-note">{meta}</p>}
            {q.ballot_status === "different_candidate_field" && <p className="results-flag">Asked before the final candidate list.</p>}
            <ul className="watch-card__rows">
              {shares.map((s) => (
                <li key={s.name} className="watch-card__row">
                  <span className="watch-card__name">{s.name}</span>
                  <span className="watch-card__share">{`${s.share.toFixed(0)}%`}</span>
                  <span className="live-bar watch-card__bar" aria-hidden="true">
                    <span style={{ width: `${(100 * s.share) / scale}%`, background: "var(--ink)" }} />
                  </span>
                </li>
              ))}
            </ul>
            {q.undecided_share ? <p className="results-note">{`Undecided: ${(100 * q.undecided_share).toFixed(0)}%`}</p> : null}
            {q.source_url && (
              <p className="results-note">
                <a href={q.source_url}>Source</a>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** The mayor's race in one ward (the prototype's): its top four as bars, and Chow's 2023 share there. */
export function MayorInWard({ race, ward }: { race: LiveRace; ward: string }) {
  const w = race.wards?.find((x) => x.num === ward);
  if (!w?.votes || !w.votes_counted) return null;
  const byKey = new Map(race.candidates.map((c) => [c.key, c] as [string, LiveCandidate]));
  const top = Object.entries(w.votes).sort((p, q) => q[1] - p[1]).slice(0, 4);
  const then = CHOW_2023.wards[ward];
  return (
    <div className="race-ballot__mayor">
      <h4>{`Mayor in Ward ${ward}`}</h4>
      <ul className="watch-card__rows">
        {top.map(([key, votes]) => {
          const c = byKey.get(key);
          const share = (100 * votes) / w.votes_counted!;
          return (
            <li key={key} className="watch-card__row">
              <span className="watch-card__name">{c?.full_name ?? key}</span>
              <span className="watch-card__share">{shareText(share, votes)}</span>
              <span className="live-bar watch-card__bar" aria-hidden="true">
                <span style={{ width: `${Math.min(100, share * 1.4)}%`, background: c ? liveColour(c, "var(--color-disengaged)") : "var(--color-disengaged)" }} />
              </span>
            </li>
          );
        })}
      </ul>
      {then && <p className="results-note">{`Olivia Chow won ${shareText(then.share)} here in the 2023 by-election.`}</p>}
      <p className="results-note">
        <Link href="/results/#map">Mayor by ward →</Link>
      </p>
    </div>
  );
}
