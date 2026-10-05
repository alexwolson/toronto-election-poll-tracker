"use client";

/**
 * PROTOTYPE — Variant C "Watch list": a news-desk page. The mayor leads as a written headline;
 * every other race is sorted into what is still in doubt, what is settling, what is waiting and
 * what is done, across all levels at once, with a level filter.
 */
import { usePrototypeParam } from "@/components/prototype-switcher";
import type { Night, ProjectionForm, RaceView } from "../_lib/stub";
import { chanceBand, levelLabel, pct, surname } from "../_lib/stub";
import {
  ForecastReference,
  LevelNote,
  LiveStrip,
  ProgressMeter,
  ProjectionCompact,
  RaceResult,
  type ForecastReferenceData,
} from "./parts";

const LEVELS = [
  { key: "all", label: "All races" },
  { key: "council", label: "Council" },
  { key: "tdsb", label: "TDSB" },
  { key: "tcdsb", label: "TCDSB" },
  { key: "french", label: "French boards" },
];

function matches(race: RaceView, level: string) {
  if (level === "all") return true;
  if (level === "tdsb") return race.shape.officeId === 3;
  if (level === "tcdsb") return race.shape.officeId === 4;
  return race.shape.level === level;
}

function favouriteWin(race: RaceView): number {
  return Math.max(...race.rows.map((r) => r.projection?.win ?? 0));
}

function margin(race: RaceView): number {
  return race.rows.length > 1 ? race.rows[0].share - race.rows[1].share : 1;
}

function mayorHeadline(race: RaceView, form: ProjectionForm, night: Night): { head: string; sub: string | null } {
  if (night.state === "pre") return { head: "Counting starts at 8 p.m.", sub: "Results appear here as the City reports them." };
  if (race.status === "complete") return { head: `${race.rows[0].name} elected mayor (unofficial)`, sub: "Every voting area has reported." };
  const [a, b] = race.rows;
  const head = `${surname(a.name)} leads ${surname(b.name)} by ${((a.share - b.share) * 100).toFixed(1)} points`;
  const progress = `with ${race.unitsIn.toLocaleString()} of ${race.shape.units.toLocaleString()} voting areas in.`;
  if (!race.projection) return { head, sub: `${progress[0].toUpperCase()}${progress.slice(1)}` };
  const o = race.projection.outcomes;
  let proj: string;
  if (form === "chance") {
    const fav = [...race.rows].filter((r) => r.projection).sort((x, y) => y.projection!.win - x.projection!.win)[0];
    proj = `Our projection gives ${surname(fav.name)} ${chanceBand(fav.projection!.win)} to win.`;
  } else if (form === "range") {
    proj = `Projected final: ${surname(a.name)} ${Math.round(a.projection!.lo * 100)}–${Math.round(a.projection!.hi * 100)}%, ${surname(b.name)} ${Math.round(b.projection!.lo * 100)}–${Math.round(b.projection!.hi * 100)}%.`;
  } else {
    proj = `${surname(o.leader)} stays 2 or more points ahead in ${Math.round(o.leaderAhead * 100)}% of simulated finishes; it ends within 2 points in ${Math.round(o.close * 100)}%.`;
  }
  return { head, sub: `${progress[0].toUpperCase()}${progress.slice(1)} ${proj}` };
}

function RaceCard({ race, form }: { race: RaceView; form: ProjectionForm }) {
  const level = race.shape.level === "council" ? "Council" : race.shape.board ?? levelLabel(race.shape.level);
  return (
    <details className="rpc-card">
      <summary>
        <span className="rpc-card__level">{level}</span>
        <span className="rpc-card__title">
          {race.shape.level === "council" ? `Ward ${race.shape.num} ${race.shape.wardName}` : race.shape.title}
        </span>
        <span className="rpc-card__lead">
          {race.status === "waiting" || race.status === "acclaimed" ? (
            race.status === "acclaimed" ? `${race.rows[0].name}` : `${race.rows.length} candidates`
          ) : (
            <>
              <strong>{surname(race.rows[0].name)}</strong> {pct(race.rows[0].share)}
              {race.rows[1] && <> · {surname(race.rows[1].name)} {pct(race.rows[1].share)}</>}
            </>
          )}
        </span>
        <ProgressMeter race={race} compact />
        <ProjectionCompact race={race} form={form} />
      </summary>
      <div className="rpc-card__detail">
        <RaceResult race={race} form={form} limit={20} />
      </div>
    </details>
  );
}

export function VariantC({ night, form, forecast, level }: { night: Night; form: ProjectionForm; forecast: ForecastReferenceData; level: string }) {
  const setParam = usePrototypeParam();
  const mayor = night.races[0];
  const others = night.races.filter((r) => r.shape.level !== "mayor" && matches(r, level));
  const projected = others.filter((r) => r.projection);
  const countOnly = others.filter((r) => r.status === "counting" && !r.projection);
  const groups = [
    {
      key: "doubt",
      title: "Still in doubt",
      blurb: "The projection gives no candidate 9 in 10 or better. Most uncertain first.",
      races: projected.filter((r) => favouriteWin(r) < 0.85).sort((a, b) => favouriteWin(a) - favouriteWin(b)),
    },
    {
      key: "settling",
      title: "Leader likely to hold",
      blurb: "The projection gives one candidate about 9 in 10 or better, but votes are still out.",
      races: projected.filter((r) => favouriteWin(r) >= 0.85).sort((a, b) => favouriteWin(a) - favouriteWin(b)),
    },
    {
      key: "count",
      title: "Counting, no projection",
      blurb: "Levels without a qualified projection. Closest count first.",
      races: countOnly.sort((a, b) => margin(a) - margin(b)),
    },
    { key: "waiting", title: "Waiting for first results", blurb: null, races: others.filter((r) => r.status === "waiting") },
    { key: "done", title: "All voting areas in (unofficial)", blurb: null, races: others.filter((r) => r.status === "complete") },
    { key: "acclaimed", title: "Acclaimed", blurb: "One candidate, so no vote.", races: others.filter((r) => r.status === "acclaimed") },
  ].filter((g) => g.races.length > 0);
  const headline = mayorHeadline(mayor, form, night);

  return (
    <main id="main-content" className="np-shell rpc">
      <section className="section rpc-hero">
        <div className="wrap">
          <LiveStrip night={night} dark />
          <p className="rpc-hero__kicker">Mayor</p>
          <h1 className="rpc-hero__head">{headline.head}</h1>
          {headline.sub && <p className="rpc-hero__sub">{headline.sub}</p>}
          <LevelNote level="mayor" night={night} />
        </div>
      </section>
      <section className="section rpc-mayor">
        <div className="wrap rpc-mayor__grid">
          <RaceResult race={mayor} form={form} limit={5} />
          {night.state !== "final" && <ForecastReference forecast={forecast} compact />}
        </div>
      </section>
      <section className="section rpc-desk" aria-labelledby="rpc-desk-h">
        <div className="wrap">
          <h2 id="rpc-desk-h" className="section-title">Council and school-board races</h2>
          <div className="rpc-filters" role="group" aria-label="Show races for">
            {LEVELS.map((l) => (
              <button
                type="button"
                key={l.key}
                className={`rpc-filter${level === l.key ? " rpc-filter--on" : ""}`}
                aria-pressed={level === l.key}
                onClick={() => setParam({ level: l.key })}
              >
                {l.label}
              </button>
            ))}
          </div>
          <LevelNote level="council" night={night} />
          <LevelNote level="trustee" night={night} />
          {groups.map((g) => (
            <div className="rpc-group" key={g.key}>
              <h3 className="rpc-group__title">
                {g.title} <span>{g.races.length}</span>
              </h3>
              {g.blurb && <p className="rpc-group__blurb">{g.blurb}</p>}
              <div className="rpc-group__list">
                {g.races.map((r) => (
                  <RaceCard race={r} form={form} key={r.shape.id} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
