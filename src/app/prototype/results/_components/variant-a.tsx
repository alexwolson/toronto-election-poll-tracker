/**
 * PROTOTYPE — Variant A "Scoreboard": one long page in office order. The mayor gets the full
 * tally + projection; every other race is one row of a dense table that expands in place.
 */
import type { Level, Night, ProjectionForm, RaceView } from "../_lib/stub";
import { levelLabel, pct } from "../_lib/stub";
import {
  ForecastReference,
  LevelNote,
  LiveStrip,
  ProgressMeter,
  ProjectionCompact,
  RaceResult,
  StatusTag,
  type ForecastReferenceData,
} from "./parts";

function RaceTable({ races, form, night, level }: { races: RaceView[]; form: ProjectionForm; night: Night; level: Level }) {
  const showProjection = night.state !== "pre" && level !== "french" && night.gates[level as "council" | "trustee"];
  return (
    <div className={`rpa-table${showProjection ? "" : " rpa-table--noproj"}`}>
      <div className="rpa-table__head" aria-hidden="true">
        <span>Race</span>
        <span>Leading in the count</span>
        <span>Voting areas in</span>
        {showProjection && <span>Projection</span>}
      </div>
      {races.map((race) => (
        <details className="rpa-row" key={race.shape.id}>
          <summary className="rpa-row__summary">
            <span className="rpa-row__race">
              <strong>{race.shape.level === "council" ? `Ward ${race.shape.num}` : race.shape.title}</strong>
              <span>{race.shape.level === "council" ? race.shape.wardName : race.shape.district?.replace(/^Ward \d+ — /, "")}</span>
            </span>
            <span className="rpa-row__lead">
              {race.status === "counting" || race.status === "complete" ? (
                <>
                  <strong>{race.rows[0].name}</strong> {pct(race.rows[0].share)}
                  {race.rows[1] && (
                    <span className="rpa-row__margin">
                      +{((race.rows[0].share - race.rows[1].share) * 100).toFixed(1)} over {race.rows[1].name}
                    </span>
                  )}
                </>
              ) : race.status === "acclaimed" ? (
                <>
                  <strong>{race.rows[0].name}</strong> acclaimed
                </>
              ) : (
                <span className="rpa-row__muted">{race.rows.length} candidates</span>
              )}
              <StatusTag race={race} />
            </span>
            <span className="rpa-row__progress">
              <ProgressMeter race={race} compact />
            </span>
            {showProjection && (
              <span className="rpa-row__proj">
                <ProjectionCompact race={race} form={form} />
              </span>
            )}
          </summary>
          <div className="rpa-row__detail">
            <RaceResult race={race} form={form} limit={20} />
          </div>
        </details>
      ))}
    </div>
  );
}

export function VariantA({ night, form, forecast }: { night: Night; form: ProjectionForm; forecast: ForecastReferenceData }) {
  const mayor = night.races[0];
  const council = night.races.filter((r) => r.shape.level === "council");
  const tdsb = night.races.filter((r) => r.shape.officeId === 3);
  const tcdsb = night.races.filter((r) => r.shape.officeId === 4);
  const french = night.races.filter((r) => r.shape.level === "french");

  return (
    <main id="main-content" className="np-shell rpa">
      <section className="section rpa-top">
        <div className="wrap">
          <h1 className="rpa-title">Toronto election results</h1>
          <LiveStrip night={night} />
        </div>
      </section>

      <section className="section rpa-mayor" aria-labelledby="rpa-mayor-h">
        <div className="wrap">
          <div className="rpa-section-head">
            <h2 id="rpa-mayor-h" className="section-title">Mayor</h2>
            <ProgressMeter race={mayor} />
          </div>
          <LevelNote level="mayor" night={night} />
          <div className={`rpa-mayor__grid${night.state === "pre" ? " rpa-mayor__grid--pre" : ""}`}>
            <RaceResult race={mayor} form={form} limit={5} />
            {night.state !== "final" && <ForecastReference forecast={forecast} compact />}
          </div>
        </div>
      </section>

      {(
        [
          ["council", levelLabel("council"), council, "Councillor, 25 wards"],
          ["trustee", "Toronto District School Board", tdsb, "Trustee, 12 wards"],
          ["trustee", "Toronto Catholic District School Board", tcdsb, "Trustee, 12 wards"],
          ["french", levelLabel("french"), french, "Viamonde and MonAvenir trustees"],
        ] as const
      ).map(([level, title, races, sub]) => (
        <section className="section rpa-level" key={title} aria-label={title}>
          <div className="wrap">
            <div className="rpa-section-head">
              <h2 className="section-title">{title}</h2>
              <span className="rpa-section-head__sub">{sub}</span>
            </div>
            <LevelNote level={level} night={night} />
            <RaceTable races={races} form={form} night={night} level={level} />
          </div>
        </section>
      ))}
    </main>
  );
}
