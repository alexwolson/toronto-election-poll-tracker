"use client";

/**
 * PROTOTYPE — Variant B "Your ballot": the reader picks a City ward first and sees the three or
 * four races on their own ballot (mayor, councillor, TDSB and TCDSB trustee, French boards folded
 * away), then the rest of the city as a tile grid. Trustee-ward coverage is the trustee feed's
 * real `city_wards` mapping.
 */
import { usePrototypeParam } from "@/components/prototype-switcher";
import type { Night, ProjectionForm, RaceView } from "../_lib/stub";
import { pct, surname } from "../_lib/stub";
import {
  ForecastReference,
  LevelNote,
  LiveStrip,
  ProgressMeter,
  ProjectionCompact,
  RaceResult,
  type ForecastReferenceData,
} from "./parts";

function BallotCard({ kicker, title, race, night, form, children }: {
  kicker: string;
  title: string;
  race: RaceView;
  night: Night;
  form: ProjectionForm;
  children?: React.ReactNode;
}) {
  return (
    <article className="rpb-card">
      <header className="rpb-card__head">
        <span className="rpb-card__kicker">{kicker}</span>
        <h2 className="rpb-card__title">{title}</h2>
        <ProgressMeter race={race} />
      </header>
      <LevelNote level={race.shape.level} night={night} />
      <RaceResult race={race} form={form} limit={race.shape.level === "mayor" ? 4 : 8} />
      {children}
    </article>
  );
}

export function VariantB({ night, form, forecast, ward }: { night: Night; form: ProjectionForm; forecast: ForecastReferenceData; ward: number }) {
  const setParam = usePrototypeParam();
  const mayor = night.races[0];
  const council = night.races.filter((r) => r.shape.level === "council");
  const mine = (officeId: number) => night.races.filter((r) => r.shape.officeId === officeId && r.shape.cityWards?.includes(ward));
  const councilRace = council.find((r) => r.shape.num === ward)!;
  const [tdsb] = mine(3);
  const [tcdsb] = mine(4);
  const french = [...mine(5), ...mine(6)];
  const wardTally = mayor.wards?.find((w) => w.num === ward);

  return (
    <main id="main-content" className="np-shell rpb">
      <section className="section rpb-picker">
        <div className="wrap">
          <h1 className="rpb-picker__title">Your ballot, live</h1>
          <label className="rpb-picker__label">
            <span>Your ward</span>
            <select value={ward} onChange={(e) => setParam({ ward: e.target.value })}>
              {council.map((r) => (
                <option key={r.shape.num} value={r.shape.num}>
                  Ward {r.shape.num} {r.shape.wardName}
                </option>
              ))}
            </select>
          </label>
          <LiveStrip night={night} dark />
        </div>
      </section>

      <section className="section rpb-ballot" aria-label="Races on your ballot">
        <div className="wrap rpb-ballot__grid">
          <BallotCard kicker="Citywide" title="Mayor" race={mayor} night={night} form={form}>
            {wardTally && wardTally.unitsIn > 0 && (
              <div className="rpb-inward">
                <p className="rpb-inward__title">
                  Mayoral vote in Ward {ward}: {wardTally.unitsIn} of {wardTally.units} voting areas in
                </p>
                <p>
                  {wardTally.rows.slice(0, 3).map((r, i) => (
                    <span key={r.name}>
                      {i > 0 && " · "}
                      <span className="rp-swatch" style={{ background: r.slug ? `var(--color-${r.slug})` : "var(--rp-bar-soft)" }} aria-hidden="true" />
                      {surname(r.name)} {pct(r.share)}
                    </span>
                  ))}
                </p>
              </div>
            )}
            {night.state !== "final" && (
              <details className="rpb-more">
                <summary>The final pre-election forecast</summary>
                <ForecastReference forecast={forecast} compact />
              </details>
            )}
          </BallotCard>
          <BallotCard kicker={`Ward ${ward}`} title={`Councillor, ${councilRace.shape.wardName}`} race={councilRace} night={night} form={form} />
          {tdsb && (
            <BallotCard kicker="If you support the public board" title={`${tdsb.shape.title} trustee`} race={tdsb} night={night} form={form} />
          )}
          {tcdsb && (
            <BallotCard kicker="If you support the Catholic board" title={`${tcdsb.shape.title} trustee`} race={tcdsb} night={night} form={form} />
          )}
          {french.length > 0 && (
            <details className="rpb-card rpb-french">
              <summary>Voting for a French-language board? {french.map((r) => r.shape.title).join(" or ")}</summary>
              {french.map((r) => (
                <div key={r.shape.id} className="rpb-french__race">
                  <h3>{r.shape.title} ({r.shape.district?.replace(/^Ward \d+ — /, "")})</h3>
                  <ProgressMeter race={r} />
                  <LevelNote level="french" night={night} />
                  <RaceResult race={r} form={form} />
                </div>
              ))}
            </details>
          )}
        </div>
      </section>

      <section className="section rpb-city" aria-labelledby="rpb-city-h">
        <div className="wrap">
          <h2 id="rpb-city-h" className="section-title">Council across the city</h2>
          <LevelNote level="council" night={night} />
          <div className="rpb-tiles">
            {council.map((r) => (
              <button
                type="button"
                key={r.shape.id}
                className={`rpb-tile${r.shape.num === ward ? " rpb-tile--mine" : ""} rpb-tile--${r.status}`}
                onClick={() => setParam({ ward: String(r.shape.num) })}
              >
                <span className="rpb-tile__num">Ward {r.shape.num}</span>
                <span className="rpb-tile__name">{r.shape.wardName}</span>
                <span className="rpb-tile__lead">
                  {r.status === "waiting" ? "No results yet" : `${surname(r.rows[0].name)} ${pct(r.rows[0].share, 0)}`}
                </span>
                <ProgressMeter race={r} compact />
                {night.gates.council && night.state !== "pre" && <ProjectionCompact race={r} form={form} />}
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
