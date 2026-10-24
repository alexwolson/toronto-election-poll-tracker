"use client";

/**
 * Two Chows on the ballot (Alex, 2026-10-24): Braeden Chow sits directly above Olivia Chow on the
 * alphabetical ballot. Three charts, from the count only: whether his votes could cover Bradford's
 * lead (only while Olivia Chow trails), how his count compares with the candidates no forecast or
 * poll named, and whether his vote follows hers ward by ward. Arithmetic and comparison; never a
 * claim that any vote was misdirected.
 */

import { liveColour } from "@/lib/live-colour";
import { shareText } from "@/lib/live-share";
import type { LiveRace } from "@/types/live";

const BRAEDEN = "Braeden Chow";
const OLIVIA = "Olivia Chow";
const BRAD = "Brad Bradford";
const INK = "var(--ink)";
const GREY = "var(--color-disengaged)";
const NEIGHBOUR = "#c4501b";

/** Ballot order: by surname, then given names (the last word as surname, close enough here). */
const surnameKey = (name: string) => {
  const parts = name.split(" ");
  return `${parts[parts.length - 1]} ${parts.slice(0, -1).join(" ")}`.toLowerCase();
};

function headline(ratio: number | null): string {
  if (ratio === null) return "Two Chows on the ballot";
  if (ratio >= 0.9 && ratio <= 1.1) return "Braeden Chow’s votes about equal Bradford’s lead";
  if (ratio > 1.1) return "Braeden Chow’s votes exceed Bradford’s lead";
  return ratio < 0.5 ? "Bradford’s lead dwarfs Braeden Chow’s votes" : "Braeden Chow’s votes fall short of Bradford’s lead";
}

export function TwoChows({ mayor, named }: { mayor: LiveRace; named: string[] }) {
  const byName = new Map(mayor.candidates.map((c) => [c.full_name, c]));
  const bc = byName.get(BRAEDEN), oc = byName.get(OLIVIA), bb = byName.get(BRAD);
  const total = mayor.candidates.reduce((a, c) => a + (c.votes ?? 0), 0);
  if (!bc || !oc || !bb || total === 0) return null;
  const share = (votes: number | null) => (100 * (votes ?? 0)) / total;
  const known = new Set(named);
  const group = mayor.candidates.filter((c) => !known.has(c.full_name) && c.full_name !== BRAEDEN);
  const shares = group.map((c) => share(c.votes)).sort((a, b) => a - b);
  const median = shares[Math.floor(shares.length / 2)] ?? 0;
  const typical = Math.round((median / 100) * total);
  const above = Math.max(0, (bc.votes ?? 0) - typical);
  const lead = (bb.votes ?? 0) - (oc.votes ?? 0);
  const ballot = mayor.candidates.map((c) => c.full_name).sort((a, b) => surnameKey(a).localeCompare(surnameKey(b), "en-CA"));
  const at = ballot.indexOf(BRAD);
  const neighbours = [ballot[at - 1], ballot[at + 1]].filter((n) => n && !known.has(n)).map((n) => byName.get(n)!);
  const beaten = group.filter((c) => share(c.votes) < share(bc.votes)).length;

  // Ward by ward: Olivia Chow's share against Braeden Chow's.
  const points = (mayor.wards ?? [])
    .filter((w) => w.votes && w.votes_counted)
    .map((w) => ({ num: w.num, x: (100 * (w.votes![OLIVIA] ?? 0)) / w.votes_counted!, y: (100 * (w.votes![BRAEDEN] ?? 0)) / w.votes_counted! }));
  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
  const mx = mean(points.map((p) => p.x)), my = mean(points.map((p) => p.y));
  let sxy = 0, sxx = 0, syy = 0;
  for (const p of points) { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2; syy += (p.y - my) ** 2; }
  const r = sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;

  return (
    <section className="two-chows" aria-labelledby="two-chows-h">
      <h2 id="two-chows-h">{headline(lead > 0 ? (bc.votes ?? 0) / lead : null)}</h2>
      <p className="race-hero-dek">Braeden Chow is listed directly above Olivia Chow on the ballot. Some voters worried the names could be confused. The two are not related.</p>
      {lead > 0 && (
        <GapBars
          rows={[
            { label: "Bradford’s lead over Olivia Chow", value: lead, colour: liveColour(bb) },
            { label: "All of Braeden Chow’s votes", value: bc.votes ?? 0, colour: INK },
            { label: "Braeden Chow’s votes above a typical unknown candidate’s", value: above, colour: GREY },
          ]}
          line={lead}
        />
      )}
      <div className="live-chart-pair two-chows__pair">
        <figure className="live-chart">
          <figcaption>
            <h3>{beaten >= group.length * 0.9 ? `Braeden Chow outpolls ${beaten} of ${group.length} unknown candidates` : `Braeden Chow’s share among ${group.length} unknown candidates`}</h3>
          </figcaption>
          <DotStrip group={group.map((c) => ({ key: c.key, share: share(c.votes), neighbour: neighbours.includes(c) }))} braeden={share(bc.votes)} median={median} />
          <p className="live-chart__caption">“Unknown” means no poll or forecast named them. Bradford’s ballot neighbours are in orange.</p>
        </figure>
        <figure className="live-chart">
          <figcaption>
            <h3>{r >= 0.5 ? "Where Olivia Chow does better, so does Braeden Chow" : r <= -0.5 ? "Where Olivia Chow does better, Braeden Chow does worse" : "Braeden Chow’s vote doesn’t follow Olivia Chow’s"}</h3>
          </figcaption>
          <WardScatter points={points} oliviaColour={liveColour(oc)} />
          <p className="live-chart__caption">{`The correlation across wards is ${r.toFixed(2)}.`}</p>
        </figure>
      </div>
    </section>
  );
}

/** Bars on one scale with a dashed line at Bradford's lead: whether a bar reaches it. */
function GapBars({ rows, line }: { rows: { label: string; value: number; colour: string }[]; line: number }) {
  const max = Math.max(...rows.map((r) => r.value)) * 1.04;
  return (
    <figure className="live-chart">
      <div className="forecast-chart two-chows__gaps" role="list" style={{ ["--gap-at" as string]: `${(100 * line) / max}%` }}>
        {rows.map((r) => (
          <div key={r.label} className="forecast-chart__row" role="listitem">
            <span className="forecast-chart__label">{r.label}</span>
            <span className="forecast-chart__track" aria-hidden="true">
              <span className="forecast-chart__bar" style={{ width: `${(100 * r.value) / max}%`, background: r.colour }} />
              <i className="two-chows__line" />
            </span>
            <strong className="forecast-chart__value">{r.value.toLocaleString("en-CA")}</strong>
          </div>
        ))}
      </div>
    </figure>
  );
}

function DotStrip({ group, braeden, median }: { group: { key: string; share: number; neighbour: boolean }[]; braeden: number; median: number }) {
  const W = 520, H = 120, m = 14, y0 = 64;
  const max = Math.max(braeden, ...group.map((g) => g.share), 0.5) * 1.15;
  const X = (v: number) => m + (Math.sqrt(Math.max(0, v)) / Math.sqrt(max)) * (W - 2 * m);
  const anchor = (x: number) => (x > W - 90 ? "end" : x < 90 ? "start" : "middle");
  const near = Math.abs(X(median) - X(braeden)) < 170;
  return (
    <svg className="live-chart__plot two-chows__svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Shares of ${group.length} unknown candidates; Braeden Chow has ${shareText(braeden)}`}>
      <line x1={m} x2={W - m} y1={y0} y2={y0} stroke="var(--rule)" />
      {[0.1, 1, 3, 10].filter((v) => v < max).map((v) => (
        <text key={v} x={X(v)} y={y0 + 34} textAnchor="middle" fontSize={12} fill="var(--muted)">{`${v}%`}</text>
      ))}
      {group.map((g, i) => (
        <circle key={g.key} cx={X(g.share)} cy={y0 + ((i % 3) - 1) * 6} r={g.neighbour ? 6 : 4.5} fill={g.neighbour ? NEIGHBOUR : GREY} fillOpacity={g.neighbour ? 1 : 0.55} />
      ))}
      <circle cx={X(braeden)} cy={y0} r={9} fill={INK} stroke="var(--paper)" strokeWidth={2} />
      <text x={X(braeden)} y={y0 - 18} textAnchor={anchor(X(braeden))} fontSize={13} fontWeight={700} fill={INK}>{`Braeden Chow ${shareText(braeden)}`}</text>
      <text x={X(median)} y={y0 - (near ? 36 : 18)} textAnchor={anchor(X(median))} fontSize={13} fill="var(--muted)">{`Typical ${shareText(median)}`}</text>
    </svg>
  );
}

function WardScatter({ points, oliviaColour }: { points: { num: string; x: number; y: number }[]; oliviaColour: string }) {
  const W = 520, H = 280, m = { t: 12, r: 14, b: 44, l: 52 };
  if (points.length === 0) return null;
  const x0 = Math.floor(Math.min(...points.map((p) => p.x)) / 10) * 10, x1 = Math.ceil(Math.max(...points.map((p) => p.x)) / 10) * 10;
  const yStep = Math.max(...points.map((p) => p.y)) > 2 ? 1 : 0.5;
  const y1 = Math.max(yStep, Math.ceil(Math.max(...points.map((p) => p.y)) / yStep) * yStep);
  const X = (v: number) => m.l + ((v - x0) / Math.max(1, x1 - x0)) * (W - m.l - m.r);
  const Y = (v: number) => m.t + (1 - v / y1) * (H - m.t - m.b);
  const yTicks = Array.from({ length: Math.round(y1 / yStep) + 1 }, (_, i) => i * yStep);
  const xTicks = Array.from({ length: Math.round((x1 - x0) / 10) + 1 }, (_, i) => x0 + i * 10);
  return (
    <svg className="live-chart__plot two-chows__svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Ward by ward, Braeden Chow's share against Olivia Chow's">
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={m.l} x2={W - m.r} y1={Y(v)} y2={Y(v)} stroke="var(--rule-soft)" />
          <text x={m.l - 8} y={Y(v) + 4} textAnchor="end" fontSize={12} fill="var(--muted)">{`${v % 1 ? v.toFixed(1) : v}%`}</text>
        </g>
      ))}
      {xTicks.map((v) => <text key={v} x={X(v)} y={H - 26} textAnchor="middle" fontSize={12} fill="var(--muted)">{`${v}%`}</text>)}
      <text x={(m.l + W - m.r) / 2} y={H - 6} textAnchor="middle" fontSize={13} fontWeight={600} fill={oliviaColour}>Olivia Chow’s share in the ward →</text>
      <text transform={`translate(14 ${(m.t + H - m.b) / 2}) rotate(-90)`} textAnchor="middle" fontSize={13} fontWeight={600} fill={INK}>Braeden Chow’s share →</text>
      {points.map((p) => (
        <circle key={p.num} cx={X(p.x)} cy={Y(p.y)} r={6} fill={INK} fillOpacity={0.8} stroke="var(--paper)">
          <title>{`Ward ${p.num}: Olivia Chow ${shareText(p.x)}, Braeden Chow ${shareText(p.y)}`}</title>
        </circle>
      ))}
    </svg>
  );
}
