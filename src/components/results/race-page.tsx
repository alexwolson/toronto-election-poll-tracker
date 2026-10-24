"use client";

/**
 * One race's page (results redesign, Alex, 2026-10-24): /parkdale-high-park/, /tdsb/5/. The top
 * depends on the editor's call (a contest's three, a head-to-head's pair, a quiet race's whole
 * field) unless the count makes the race close or puts someone unexpected ahead; the projected
 * finish sits beside it. Below, the same full results on every race page: every candidate, turnout,
 * the race over the night, the last election, any polls, the candidates and the rest of the
 * ballot. An acclaimed race's page says so and stops.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { CandidateHistoryItem } from "@/components/candidate-history";
import { WardPolls } from "@/components/ward-polls";
import { liveColour } from "@/lib/live-colour";
import { shortLabel } from "@/lib/live-labels";
import { shareText } from "@/lib/live-share";
import { catchUp, contenders, counted, promotionReasons, raceColours } from "@/lib/race-model";
import { WORDING, isAcclaimed, rangeNote, type Levels } from "@/lib/race-results";
import { candidateSetup, type RaceSetup } from "@/lib/race-setup";
import type { ResultsMapData } from "@/lib/results-map-data";
import type { WardPoll } from "@/types/feeds";
import type { LiveCandidate, LivePayload, LiveRace } from "@/types/live";
import { useLiveState } from "./live-results-poller";
import { RaceCount } from "./live-count-view";
import { ProjectedFinish } from "./mayor-lead";

import { CandidatePanel, CandidateTable, CandidateTag, CatchUpFigure, Locator, PriorTable, WholeField, votesText } from "./race-parts";
import { ResultsBar, resultsStatus } from "./results-status";
import { TurnoutBar } from "./turnout-bar";

export interface RaceLink {
  id: string;
  href: string;
  title: string;
}

export interface RacePageProps {
  setup: RaceSetup;
  prev: RaceLink | null;
  next: RaceLink | null;
  map: Pick<ResultsMapData, "view_box" | "wards">;
  /** The other races on this race's ballots: a ward's trustee races, or the wards a trustee area covers. */
  ballot: RaceLink[];
}

/** The race card's risk factors, in plain words from the race's own last result. */
function exposureLines(setup: RaceSetup): string[] {
  const p = setup.prior;
  const incumbent = setup.incumbents[0];
  if (!p || !incumbent) return [];
  const last = incumbent.split(" ").slice(-1)[0];
  return setup.exposure.flatMap((key) => {
    if (key === "ward_growth_exceeds_cushion") return [`The ward has added more new voters since ${p.year} than ${last}’s winning margin.`];
    if (key === "narrow_prior_win") return [`${last}’s ${p.year} share is low for a sitting councillor.`];
    if (key === "high_structural_exposure") return ["Before the vote, our analysis rated this among the wards where an incumbent is most at risk."];
    return [];
  });
}

/** The editor's extra polls (`editorial-races.json`) in the race card's poll shape, for WardPolls. */
function editorialPolls(setup: RaceSetup): WardPoll[] {
  return (setup.ed.polls ?? []).map((poll, i) => ({
    poll_id: `editorial-${setup.id}-${i}`,
    firm: poll.firm,
    date_conducted: poll.date,
    date_published: poll.date,
    sample_size: poll.n,
    methodology: poll.method ?? "",
    denominator: "decided voters",
    ballot_status: "current",
    undecided_share: null,
    candidates: poll.shares.map((s, j) => ({
      candidate_id: `${setup.id}-${j}`,
      candidate_name: s.name,
      share: s.share / 100,
      is_incumbent: setup.incumbents.includes(s.name),
      is_residual: false,
      registration_status: "registered" as const,
    })),
  }));
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="live-subsection race-section" id={id} aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`}>{title}</h3>
      {children}
    </section>
  );
}

export function RacePage(props: RacePageProps) {
  const { state, now } = useLiveState();
  const { results, status } = resultsStatus(state, now);
  const payload = results?.payload ?? null;
  const race = payload?.races.find((r) => r.id === props.setup.id) ?? null;
  return (
    <>
      <ResultsBar status={status} />
      <RaceBody {...props} race={race} payload={payload} closed={results?.closed ?? false} />
    </>
  );
}

function RaceBody({ setup, prev, next, map, ballot, race, payload, closed }: RacePageProps & { race: LiveRace | null; payload: LivePayload | null; closed: boolean }) {
  const levels: Levels | null = payload?.levels ?? null;
  const ed = setup.ed;
  const byVotes = race ? [...race.candidates].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0)) : [];
  const big = race ? contenders(race, ed) : [];
  const colours = race ? raceColours(race, big, (c) => { const own = liveColour(c, ""); return own || null; }) : {};
  const colourOf = (c: LiveCandidate) => colours[c.key] ?? "var(--color-disengaged)";
  const setupOf = (c: LiveCandidate) => candidateSetup(setup, c);
  const nameOf = (c: LiveCandidate) => shortLabel(c);
  const acclaimed = setup.acclaimed || (race !== null && isAcclaimed(race));
  const hasVotes = race !== null && counted(race);
  const reasons = race ? promotionReasons(race, ed) : [];
  const contest = ed.type === "contest";
  const [A, B] = byVotes;
  const cu = race && hasVotes ? catchUp(race) : null;

  // The heading's one sentence: who leads whom, by how much.
  let dek: ReactNode = null;
  if (acclaimed) {
    const only = race?.candidates[0]?.full_name ?? setup.ed.featured[0] ?? "";
    dek = <>No one ran against {setup.incumbents.includes(only) ? "incumbent " : ""}<strong>{only}</strong>. {WORDING.acclaimedNote}</>;
  } else if (race && !hasVotes) {
    dek = <>No votes have been counted in this race yet.</>;
  } else if (race && A && B) {
    dek =
      contest && big.length === 3 ? (
        <><strong>{A.full_name}</strong> leads <strong>{big[1].full_name}</strong> by {votesText((A.votes ?? 0) - (big[1].votes ?? 0))} and <strong>{big[2].full_name}</strong> by {votesText((A.votes ?? 0) - (big[2].votes ?? 0))}.</>
      ) : (
        <><strong>{A.full_name}</strong> leads <strong>{B.full_name}</strong> by {votesText((A.votes ?? 0) - (B.votes ?? 0))} ({((A.share ?? 0) - (B.share ?? 0)).toFixed(1)} points).</>
      );
  }
  const incumbentNow = byVotes.find((c) => setup.incumbents.includes(c.full_name));
  const incumbentNote = race && hasVotes && incumbentNow && incumbentNow !== A && !big.includes(incumbentNow)
    ? ` Incumbent ${incumbentNow.full_name} is ${ordinal(byVotes.indexOf(incumbentNow) + 1)} with ${shareText(incumbentNow.share, incumbentNow.votes)}.`
    : "";

  const progress = race?.progress;
  const meta = [
    setup.kind === "council" ? "Councillor" : "School trustee",
    acclaimed ? null : `${race?.candidates.length ?? Object.keys(setup.candidates).length} candidates`,
    acclaimed ? WORDING.acclaimed : setup.open ? "Open seat" : setup.incumbents.length ? `Incumbent${setup.incumbents.length > 1 ? "s" : ""}: ${setup.incumbents.join(" and ")}` : null,
    !acclaimed && race?.state === "all_units_in" ? WORDING.all_units_in : !acclaimed && progress ? `${progress.received.toLocaleString("en-CA")} of ${progress.total.toLocaleString("en-CA")} voting areas in` : !acclaimed && race?.state === "counting" ? WORDING.no_progress : null,
  ].filter(Boolean).join(" · ");

  const header = (
    <>
      <nav className="breadcrumb race-crumbs" aria-label="Breadcrumb">
        <Link href={setup.kind === "council" ? "/results/#council" : "/results/#boards"}>{setup.kind === "council" ? "Council: 25 races" : "School board trustees"}</Link>
        <span className="race-crumbs__step">
          {prev && <Link href={prev.href}>{`← ${prev.title}`}</Link>}
          {next && <Link href={next.href}>{`${next.title} →`}</Link>}
        </span>
      </nav>
    </>
  );

  const hero = (
    <div className="race-page__head">
      <div className="race-page__title">
        <Locator viewBox={map.view_box} wards={map.wards} covered={setup.cityWards} label={`Map of Toronto with ${setup.kind === "council" ? `Ward ${setup.num}` : `the wards ${setup.title} covers`} highlighted`} />
        <div>
          <p className="t-kicker race-page__kicker">{setup.kicker}</p>
          <h1>{setup.title}</h1>
        </div>
      </div>
      <p className="race-hero-meta">{meta}</p>
      {setup.kind !== "council" && (
        <p className="t-body-small">
          Covers{" "}
          {ballot.map((w, i) => (
            <span key={w.id}>
              {i > 0 && (i === ballot.length - 1 ? " and " : ", ")}
              <Link href={w.href}>{w.title}</Link>
            </span>
          ))}
        </p>
      )}
      {dek && <p className="race-hero-dek">{dek}{incumbentNote}</p>}
    </div>
  );

  // Paused, or before the first poll: the status line says why, and nothing claims a count.
  if (payload === null) {
    return (
      <main id="main-content" className="np-shell">
        <div className="wrap race-page">
          {header}
          {hero}
        </div>
      </main>
    );
  }

  if (acclaimed) {
    const only = race?.candidates[0];
    const past = only ? setupOf(only)?.past ?? [] : [];
    return (
      <main id="main-content" className="np-shell">
        <div className="wrap race-page">
          {header}
          {hero}
          {past.length > 0 && (
            <ul className="candidate-list">
              <CandidateHistoryItem name={only!.full_name} history={past} campaignUrl={setupOf(only!)?.url ?? null} />
            </ul>
          )}
        </div>
      </main>
    );
  }

  // The top: the editor's call, unless the count promotes a quiet or two-way race to a close one.
  const kind = !race || !hasVotes ? "waiting" : reasons.length && !contest ? "close" : ed.type;
  const priorLine = (() => {
    const p = setup.prior;
    if (ed.compare === "poll" && ed.polls?.[0]) {
      const q = ed.polls[0];
      return <><strong>{`${q.firm} poll, ${q.dates}`}</strong>{` (${q.n.toLocaleString("en-CA")} respondents): ${q.shares.map((s) => `${s.name} ${s.share.toFixed(1)}%`).join(", ")}.`}</>;
    }
    if (!p || !p.runner_up_name) return null;
    const when = p.year === 2022 ? "2022" : `${p.year} by-election`;
    return <><strong>{`${when}:`}</strong>{` ${p.winner_name} beat ${p.runner_up_name} by ${votesText(p.margin_votes)}.`}</>;
  })();
  const catchFigure = cu && race && big.length >= 2 && <CatchUpFigure catchUp={cu} race={big.length === 3 ? big : big.slice(0, 2)} colourOf={colourOf} nameOf={nameOf} />;
  const flag = reasons.length > 0 && <p className="callout" role="status">{`${reasons.join(". ")}.`}</p>;
  const outside = byVotes.filter((c) => (ed.outside ?? []).includes(c.full_name));

  let opening: ReactNode = null;
  if (kind === "waiting") {
    opening = race && (
      <p className="t-body">
        On the ballot: {race.candidates.map((c) => c.full_name).join(", ")}.
      </p>
    );
  } else if (kind === "contest" || kind === "open") {
    const shown = kind === "open" ? byVotes.slice(0, 3) : big;
    opening = (
      <>
        {flag}
        <div className={`grid ${shown.length > 2 ? "grid--3" : "grid--2"} race-panels`}>
          {shown.map((c) => <CandidatePanel key={c.key} candidate={c} setup={setupOf(c)} colour={colourOf(c)} />)}
        </div>
        {outside.length > 0 && <p className="t-body-small">{`Also watched: ${outside.map((c) => `${c.full_name} (${ordinal(byVotes.indexOf(c) + 1)}, ${shareText(c.share, c.votes)})`).join("; ")}.`}</p>}
        {catchFigure}
      </>
    );
  } else if (kind === "head" || kind === "close") {
    const pair = kind === "head" ? byVotes.filter((c) => ed.featured.includes(c.full_name)).slice(0, 2) : [A, B];
    const third = byVotes.find((c) => (ed.outside ?? []).includes(c.full_name));
    opening = (
      <>
        {kind === "close" && flag}
        <div className="grid grid--2 race-panels">
          {pair.filter(Boolean).map((c) => <CandidatePanel key={c.key} candidate={c} setup={setupOf(c)} colour={colourOf(c)} />)}
        </div>
        {priorLine && (kind === "head" || ed.type === "head") && <p className="t-body-small">{priorLine}</p>}
        {third && <p className="t-body-small">{`${third.full_name} is ${ordinal(byVotes.indexOf(third) + 1)} with ${shareText(third.share, third.votes)}.`}</p>}
        {catchFigure}
      </>
    );
  } else {
    opening = <WholeField candidates={byVotes} colourOf={colourOf} setupOf={setupOf} />;
  }

  const note = race ? rangeNote(race, levels) : null;
  const exposure = exposureLines(setup);
  const polls = [...editorialPolls(setup), ...setup.polls];
  const showsCount = race && (race.state === "counting" || race.state === "all_units_in");

  return (
    <main id="main-content" className="np-shell">
      <div className="wrap race-page">
        {header}
        {hero}
        <div className="race-page__top">
          <div>
            <div className="race-page__opening">{opening}</div>
            <p className="t-meta"><a href="#race-full">Full results ↓</a></p>
          </div>
          {race && showsCount && setup.kind !== "french" && (
            <div>
              {/* The approved card (Alex): the race's contenders large, everyone else on asking. */}
              <ProjectedFinish race={race} leaders={big} colourOf={colourOf} />
              {note && <p className="t-body-small">{note}</p>}
            </div>
          )}
        </div>

        <section className="race-full" id="race-full" aria-labelledby="race-full-h">
          <h2 id="race-full-h">Full results</h2>
          {race && (
            <Section id="race-candidates" title="All candidates">
              {race.state === "no_figures" ? (
                <p className="live-empty">No figures from the City for this race right now</p>
              ) : (
                <CandidateTable race={race} colourOf={colourOf} setupOf={setupOf} closed={closed} />
              )}
            </Section>
          )}
          {race && setup.kind === "council" && showsCount && (
            <Section id="race-turnout" title="Turnout">
              <TurnoutBar race={race} />
            </Section>
          )}
          {race && showsCount && setup.kind !== "french" && (
            <Section id="race-night" title="How the race has changed tonight">
              <RaceCount race={race} />
            </Section>
          )}
          {setup.prior && (
            <Section id="race-prior" title="Against the last election">
              <PriorTable prior={setup.prior} race={hasVotes ? (contest ? big : byVotes.slice(0, 2)) : []} threeWay={contest && big.length === 3} fieldSize={race?.candidates.length ?? 0} />
              {exposure.length > 0 && (
                <div className="race-exposure">
                  {exposure.map((line) => <p key={line} className="t-body-small">{line}</p>)}
                  <p className="t-meta">Even so, incumbents rarely lose in Toronto: about 6% do in a typical election.</p>
                </div>
              )}
            </Section>
          )}
          {polls.length > 0 && (
            <div className="live-subsection race-section" id="race-polls">
              <WardPolls polls={polls} />
            </div>
          )}
          {race && (
            <Section id="race-people" title="Candidates">
              <ul className="candidate-list">
                {byVotes.map((c) => {
                  const s = setupOf(c);
                  return (
                    <CandidateHistoryItem
                      key={c.key}
                      name={c.full_name}
                      history={s?.past ?? []}
                      campaignUrl={s?.url ?? null}
                      summaryPrefix={[s?.tag, s?.line].filter(Boolean).join(" · ") || null}
                    />
                  );
                })}
              </ul>
              <p className="t-meta">
                Full candidate histories are on the <Link href={setup.profileHref}>{setup.kind === "council" ? `Ward ${setup.num}` : setup.title} candidates page</Link>.
              </p>
            </Section>
          )}
          {ballot.length > 0 && setup.kind === "council" && (
            <Section id="race-ballot" title="Also on this ballot">
              <BallotRaces payload={payload} links={ballot} ward={setup.num} />
            </Section>
          )}
          {ballot.length > 0 && setup.kind !== "council" && (
            <Section id="race-ballot" title="Council in the wards this area covers">
              <BallotRaces payload={payload} links={ballot} ward={null} />
            </Section>
          )}
        </section>
      </div>
    </main>
  );
}

/** The other races on these ballots, each with its leader and how much is in, linking to its page. */
function BallotRaces({ payload, links, ward }: { payload: LivePayload | null; links: RaceLink[]; ward: string | null }) {
  const mayor = payload?.races.find((r) => r.id === "mayor");
  const mayorWard = ward && mayor?.wards?.find((w) => w.num === ward);
  const rows = links.map((link) => ({ link, race: payload?.races.find((r) => r.id === link.id) ?? null }));
  return (
    <>
      {mayorWard && mayorWard.votes && mayorWard.votes_counted ? (
        <p className="t-body-small">
          {`Mayor in Ward ${ward}: `}
          {Object.entries(mayorWard.votes)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([key, v]) => `${mayor!.candidates.find((c) => c.key === key)?.full_name ?? key} ${shareText((100 * v) / mayorWard.votes_counted!, v)}`)
            .join(", ")}
          . <Link href="/results/#map">Mayor by ward →</Link>
        </p>
      ) : null}
      <div className="live-table-scroll">
        <table className="live-table">
          <thead>
            <tr>
              <th scope="col">Race</th>
              <th scope="col">Leading</th>
              <th scope="col">Margin</th>
              <th scope="col">Areas in</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ link, race }) => {
              const [first, second] = race ? [...race.candidates].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0)) : [];
              const started = race && counted(race);
              return (
                <tr key={link.id}>
                  <th scope="row"><Link href={link.href}>{link.title}</Link></th>
                  <td>{race?.state === "acclaimed" ? `${first?.full_name ?? ""} (${WORDING.acclaimed.toLowerCase()})` : started ? first?.full_name : "–"}</td>
                  <td className="live-num">{started && second ? `+${((first.share ?? 0) - (second.share ?? 0)).toFixed(1)}` : "–"}</td>
                  <td className="live-num">{race?.progress && race.state !== "acclaimed" ? `${race.progress.received}/${race.progress.total}` : "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ordinal(n: number): string {
  const s = n % 100 > 10 && n % 100 < 14 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${s}`;
}

export { CandidateTag };
