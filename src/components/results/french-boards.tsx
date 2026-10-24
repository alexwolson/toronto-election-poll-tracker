"use client";

/**
 * Toronto's French-language school boards on one bilingual page (Alex, 2026-10-24),
 * /conseils-scolaires/: French first, English on asking. Three contested races, votes first (the
 * electorates are small), each against its last result for scale; the two acclaimed areas in one
 * line; each board's areas on a small map. No estimates: the model doesn't cover these boards.
 */

import { useEffect, useState } from "react";
import { shareText } from "@/lib/live-share";
import { counted, raceColours, contenders } from "@/lib/race-model";
import type { RaceSetup } from "@/lib/race-setup";
import type { ResultsMapData, ResultsMapWard } from "@/lib/results-map-data";
import { liveColour } from "@/lib/live-colour";
import { eliminatedKeys } from "@/lib/live-eliminated";
import { RANGE_WORDING, WORDING, electedKey } from "@/lib/race-results";
import type { LiveCandidate, LiveRace } from "@/types/live";
import { useLiveState } from "./live-results-poller";
import { ResultsBar, resultsStatus } from "./results-status";

type Lang = "fr" | "en";

const T = {
  fr: {
    title: "Conseils scolaires de langue française",
    intro: "Résultats pour les électeurs des conseils scolaires de langue française de Toronto.",
    kind: { viamonde: "Conseil public", monavenir: "Conseil catholique" } as Record<string, string>,
    mapOf: (b: string) => `Secteurs de ${b}`,
    ward: "quartier",
    wards: (n: number) => `${n} quartiers`,
    votes: (n: number) => `${n.toLocaleString("fr-CA")} voix`,
    leads: (who: string, n: number) => `${who} est en tête par ${n.toLocaleString("fr-CA")} voix.`,
    none: "Aucune voix dépouillée pour l’instant.",
    areas: (a: number, b: number) => `${a.toLocaleString("fr-CA")} sections de vote dépouillées sur ${b.toLocaleString("fr-CA")}`,
    prior: (winner: string, year: number, margin: number, total: number) => `${winner} a remporté l’élection partielle de ${year} par ${margin.toLocaleString("fr-CA")} voix sur ${total.toLocaleString("fr-CA")}.`,
    noPrior: "Pas de résultat antérieur comparable.",
    acclaimed: (list: string) => `Élus par acclamation : ${list}.`,
    incumbent: "En poste",
    listSep: "; ",
    note: "Dépouillement et fourchette possible seulement : aucune estimation pour ces conseils.",
    eliminated: "Ne peut plus gagner",
    noProgress: "Sections de vote : non disponible",
    elected: "Élu(e), non officiel",
    acclaimedNote: "Aucun scrutin n’a lieu lorsqu’une seule personne se présente.",
    possible: (low: number, high: number) => `fourchette possible ${Math.round(low)} à ${Math.round(high)} %`,
  },
  en: {
    title: "French-language school boards",
    intro: "Results for voters who support Toronto’s French-language school boards.",
    kind: { viamonde: "Public board", monavenir: "Catholic board" } as Record<string, string>,
    mapOf: (b: string) => `${b} areas`,
    ward: "Ward",
    wards: (n: number) => `${n} wards`,
    votes: (n: number) => `${n.toLocaleString("en-CA")} ${n === 1 ? "vote" : "votes"}`,
    leads: (who: string, n: number) => `${who} leads by ${n.toLocaleString("en-CA")} ${n === 1 ? "vote" : "votes"}.`,
    none: "No votes counted yet.",
    areas: (a: number, b: number) => `${a.toLocaleString("en-CA")} of ${b.toLocaleString("en-CA")} voting areas in`,
    prior: (winner: string, year: number, margin: number, total: number) => `${winner} won the ${year} by-election by ${margin.toLocaleString("en-CA")} of ${total.toLocaleString("en-CA")} votes.`,
    noPrior: "No comparable earlier result.",
    acclaimed: (list: string) => `Acclaimed: ${list}.`,
    incumbent: "Incumbent",
    listSep: "; ",
    note: RANGE_WORDING.french,
    eliminated: WORDING.eliminated,
    noProgress: WORDING.no_progress,
    elected: WORDING.elected,
    acclaimedNote: WORDING.acclaimedNote,
    possible: (low: number, high: number) => `Possible ${Math.round(low)}–${Math.round(high)}%`,
  },
};

const SHADES = ["var(--ink)", "#5c6a93", "#a9b2cf"];

function BoardMap({ title, areas, setups, viewBox, wards }: { title: string; areas: ResultsMapWard[]; setups: RaceSetup[]; viewBox: string; wards: ResultsMapWard[] }) {
  // The board's own area shapes; each area's label links to its race, sized to the map's width.
  const width = Number(viewBox.split(/[ ,]+/)[2]) || 1000;
  // An area's label sits at the middle of its city wards' labels, not at the edge of its shape.
  const labelOf = (a: ResultsMapWard, s: RaceSetup | undefined) => {
    const inside = wards.filter((w) => s?.cityWards.includes(w.num));
    if (inside.length === 0) return a.label;
    return { x: inside.reduce((t, w) => t + w.label.x, 0) / inside.length, y: inside.reduce((t, w) => t + w.label.y, 0) / inside.length };
  };
  return (
    <figure className="french-map">
      <figcaption className="mayor-projection__name">{title}</figcaption>
      <svg viewBox={viewBox} role="img" aria-label={title}>
        {areas.map((a, i) => (
          <path key={a.num} d={a.path} fill={SHADES[i % SHADES.length]} stroke="var(--paper)" strokeWidth={2} />
        ))}
        {areas.map((a) => {
          const s = setups.find((x) => x.num === a.num);
          return (
            <a key={a.num} href={s ? `#${s.href.split("#")[1]}` : undefined}>
              <text x={labelOf(a, s).x} y={labelOf(a, s).y} textAnchor="middle" className="french-map__label" fontSize={width / 24} strokeWidth={width / 220}>{`${a.num} · ${s?.areaName ?? a.name ?? ""}`}</text>
            </a>
          );
        })}
      </svg>
    </figure>
  );
}

export function FrenchBoards({ setups, map }: { setups: RaceSetup[]; map: Pick<ResultsMapData, "view_box" | "boards" | "wards"> }) {
  const [lang, setLang] = useState<Lang>("fr");
  useEffect(() => {
    const asked = new URLSearchParams(window.location.search).get("lang");
    let saved: string | null = null;
    try { saved = window.localStorage.getItem("chw-lang"); } catch {}
    const next = asked === "en" || asked === "fr" ? asked : saved === "en" ? "en" : null;
    // Reading the reader's choice is browser-only, so it lands after the first paint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (next) setLang(next);
  }, []);
  const choose = (next: Lang) => {
    setLang(next);
    try { window.localStorage.setItem("chw-lang", next); } catch {}
  };
  const t = T[lang];
  const { state, now } = useLiveState();
  const { results, status } = resultsStatus(state, now);
  const payload = results?.payload ?? null;
  const contested = setups.filter((s) => !s.acclaimed);
  const acclaimed = setups.filter((s) => s.acclaimed);
  const raceOf = (s: RaceSetup) => payload?.races.find((r) => r.id === s.id) ?? null;
  const heading = (s: RaceSetup) => `${s.boardShort}, ${t.ward} ${s.num}`;
  return (
    <main id="main-content" className="np-shell" lang={lang === "fr" ? "fr-CA" : "en-CA"}>
      <ResultsBar
        status={status}
        links={
          <nav className="ward-index-sort live-seg" aria-label="Langue / Language">
            <button type="button" aria-pressed={lang === "fr"} onClick={() => choose("fr")} lang="fr">Français</button>
            <button type="button" aria-pressed={lang === "en"} onClick={() => choose("en")} lang="en">English</button>
          </nav>
        }
      />
      <section className="race-hero">
        <div className="wrap french-head">
          <div>
            <h1>{t.title}</h1>
            <p className="race-hero-dek">{t.intro}</p>
            <p className="t-body-small">{t.note}</p>
          </div>
          <div className="french-maps">
            {(["viamonde", "monavenir"] as const).map((b) => (
              <BoardMap key={b} title={t.mapOf(b === "viamonde" ? "Viamonde" : "MonAvenir")} areas={map.boards[b] ?? []} setups={setups.filter((s) => s.boardId === b)} viewBox={map.view_box} wards={map.wards} />
            ))}
          </div>
        </div>
      </section>
      {/* Paused, or before the first poll: the status line says why, and nothing claims a count. */}
      {payload && (
        <div className="wrap french-races">
          {contested.map((s) => {
            const race = raceOf(s);
            return <FrenchRace key={s.id} setup={s} race={race} t={t} heading={heading(s)} closed={results?.closed ?? false} />;
          })}
        </div>
      )}
      {acclaimed.length > 0 && (
        <div className="wrap">
          <p className="t-body french-acclaimed">
            {t.acclaimed(acclaimed.map((s) => `${raceOf(s)?.candidates[0]?.full_name ?? s.ed.featured[0] ?? ""} (${heading(s)}, ${s.areaName})`).join(t.listSep))} {t.acclaimedNote}
          </p>
        </div>
      )}
    </main>
  );
}

function FrenchRace({ setup, race, t, heading, closed }: { setup: RaceSetup; race: LiveRace | null; t: (typeof T)[Lang]; heading: string; closed: boolean }) {
  const byVotes = race ? [...race.candidates].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0)) : [];
  const has = race !== null && counted(race);
  const colours = race ? raceColours(race, contenders(race, setup.ed), (c) => liveColour(c, "") || null) : {};
  const colourOf = (c: LiveCandidate) => colours[c.key] ?? "var(--color-disengaged)";
  const max = Math.max(1, ...byVotes.map((c) => c.votes ?? 0));
  // The Possible Range is arithmetic on the count, so these boards have it too (#97).
  const out = eliminatedKeys(race?.possible ?? null);
  const elected = race ? electedKey(race, closed) : null;
  const [a, b] = byVotes;
  const p = setup.prior;
  const anchor = setup.href.split("#")[1];
  return (
    <section className="card french-race" id={anchor} aria-labelledby={`${anchor}-h`}>
      <p className="t-kicker">{t.kind[setup.boardId ?? ""]}</p>
      <h2 id={`${anchor}-h`}>
        {heading} <span className="french-race__area">({setup.areaName})</span>
      </h2>
      <details className="live-table-toggle">
        <summary>{t.wards(setup.cityWards.length)}</summary>
        <p className="t-meta">{setup.cityWards.join(", ")}</p>
      </details>
      <div className="forecast-chart french-race__rows" role="list">
        {(race?.candidates ?? []).length === 0 && <p className="t-body-small">{t.none}</p>}
        {byVotes.map((c) => (
          <div key={c.key} className="forecast-chart__row" role="listitem">
            <span className="forecast-chart__label">
              {c.full_name} {setup.incumbents.includes(c.full_name) && <span className="candidate-row__tag">{t.incumbent}</span>}
              {c.key === elected && <span className="badge badge--status">{t.elected}</span>}
              {out.has(c.key) && <span className="candidate-row__tag">{t.eliminated}</span>}
              {race?.possible?.[c.key] && <span className="visually-hidden">{t.possible(race.possible[c.key].low, race.possible[c.key].high)}</span>}
            </span>
            <span className="forecast-chart__track" aria-hidden="true">
              {has && <span className="forecast-chart__bar" style={{ width: `${(100 * (c.votes ?? 0)) / max}%`, background: colourOf(c) }} />}
            </span>
            <strong className="forecast-chart__value">{has ? t.votes(c.votes ?? 0) : "–"}</strong>
          </div>
        ))}
      </div>
      <p className="t-body">{has && a && b ? t.leads(a.full_name, (a.votes ?? 0) - (b.votes ?? 0)) : t.none}</p>
      {race?.progress ? <p className="t-meta">{t.areas(race.progress.received, race.progress.total)}</p> : race?.state === "counting" && <p className="t-meta">{t.noProgress}</p>}
      <p className="t-body-small">{p ? t.prior(p.winner_name, p.year, p.margin_votes ?? 0, Math.round(p.winner_votes / p.winner_share)) : t.noPrior}</p>
      {has && <span className="visually-hidden">{byVotes.map((c) => `${c.full_name} ${shareText(c.share, c.votes)}`).join(", ")}</span>}
    </section>
  );
}
