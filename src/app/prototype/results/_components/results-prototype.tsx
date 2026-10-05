"use client";

/**
 * PROTOTYPE — throwaway. Three layouts of the election-night results page on one route,
 * switchable via `?variant=A|B|C`, plus prototype-only controls: `state` (night state),
 * `form` (projection form), `gates` (which levels' projections passed, e.g. `mct`), `ward`
 * (variant B) and `level` (variant C). All counts and projections are seeded stubs.
 */
import { useMemo, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { PrototypeSwitcher, usePrototypeParam } from "@/components/prototype-switcher";
import { buildNight, STATES, type NightState, type ProjectionForm } from "../_lib/stub";
import type { ForecastReferenceData } from "./parts";
import { VariantA } from "./variant-a";
import { VariantB } from "./variant-b";
import { VariantC } from "./variant-c";

const VARIANTS = [
  { key: "A", name: "Scoreboard" },
  { key: "B", name: "Your ballot" },
  { key: "C", name: "Watch list" },
];
const FORMS: { key: ProjectionForm; label: string }[] = [
  { key: "chance", label: "Chance to win" },
  { key: "range", label: "Share ranges" },
  { key: "outcomes", label: "Named outcomes" },
];

export function ResultsPrototype({ forecast }: { forecast: ForecastReferenceData }) {
  const params = useSearchParams();
  const setParam = usePrototypeParam();
  const variant = VARIANTS.some((v) => v.key === params.get("variant")) ? params.get("variant")! : "A";
  const state = (STATES.some((s) => s.key === params.get("state")) ? params.get("state") : "early") as NightState;
  const form = (FORMS.some((f) => f.key === params.get("form")) ? params.get("form") : "chance") as ProjectionForm;
  const gateParam = params.get("gates") ?? "mct";
  const gates = useMemo(
    () => ({ mayor: gateParam.includes("m"), council: gateParam.includes("c"), trustee: gateParam.includes("t") }),
    [gateParam],
  );
  const ward = Math.min(25, Math.max(1, Number(params.get("ward") ?? 14) || 14));
  const level = params.get("level") ?? "all";
  const night = useMemo(() => buildNight(state, gates), [state, gates]);
  // Client-only: server and browser floating-point maths differ in the last digits, which breaks hydration.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  if (!mounted) return null;

  const toggleGate = (letter: string) =>
    setParam({ gates: ["m", "c", "t"].filter((l) => (l === letter ? !gateParam.includes(l) : gateParam.includes(l))).join("") || "none" });

  return (
    <>
      <p className="rp-banner" role="note">
        Prototype · stubbed counts and projections · race shapes from the City&rsquo;s 2026 test feed
      </p>
      {variant === "A" && <VariantA night={night} form={form} forecast={forecast} />}
      {variant === "B" && <VariantB night={night} form={form} forecast={forecast} ward={ward} />}
      {variant === "C" && <VariantC night={night} form={form} forecast={forecast} level={level} />}
      <PrototypeSwitcher variants={VARIANTS} current={variant}>
        <label className="prototype-switcher__control">
          <span>Night</span>
          <select value={state} onChange={(e) => setParam({ state: e.target.value })}>
            {STATES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.clock} {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="prototype-switcher__control">
          <span>Projection</span>
          <select value={form} onChange={(e) => setParam({ form: e.target.value })}>
            {FORMS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="prototype-switcher__control prototype-switcher__gates">
          <legend>Passed gate</legend>
          {[
            ["m", "Mayor"],
            ["c", "Council"],
            ["t", "Trustee"],
          ].map(([letter, label]) => (
            <label key={letter}>
              <input type="checkbox" checked={gateParam.includes(letter)} onChange={() => toggleGate(letter)} /> {label}
            </label>
          ))}
        </fieldset>
      </PrototypeSwitcher>
    </>
  );
}
