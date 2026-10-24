import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import council from "../../fixtures/council_race_cards.json";
import trustees from "../../fixtures/trustee_race_cards.json";
import { candidateSetup, raceSetups } from "./race-setup";
import type { CouncilRaceCardsFeed, TrusteeRaceCardsFeed } from "@/types/feeds";

const setups = raceSetups(council as unknown as CouncilRaceCardsFeed, trustees as unknown as TrusteeRaceCardsFeed);
const byId = (id: string) => setups.find((s) => s.id === id)!;

function tag(id: string, name: string): string | null {
  const s = byId(id);
  const c = (council as unknown as CouncilRaceCardsFeed).wards[s.num].candidates.find((x) => x.display_name === name)!;
  return candidateSetup(s, { candidacy_id: c.candidacy_id, full_name: name })?.tag ?? null;
}

describe("raceSetups", () => {
  it("has every council and trustee race once", () => {
    expect(setups.filter((s) => s.kind === "council")).toHaveLength(25);
    expect(new Set(setups.map((s) => s.id)).size).toBe(setups.length);
  });

  it("gives each race page a unique path that no existing route uses", () => {
    const paths = setups.filter((s) => s.kind !== "french").map((s) => s.href);
    expect(new Set(paths).size).toBe(paths.length);
    const appRoutes = readdirSync(path.join(__dirname, "../app"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
    for (const p of paths) expect(appRoutes).not.toContain(p.split("/")[1]);
    expect(byId("councillor-11").href).toBe("/university-rosedale/");
    expect(byId("councillor-12").href).toBe("/toronto-st-pauls/");
    expect(byId("tdsb-5").href).toBe("/tdsb/5/");
    expect(byId("viamonde-3").href).toBe("/conseils-scolaires/#viamonde-centre");
  });

  it("tags a sitting councillor running in another ward, not as former", () => {
    expect(tag("councillor-14", "Dianne Saxe")).toBe("Previous councillor for University-Rosedale");
    expect(tag("councillor-14", "Mary Fragedakis")).toBe("Former councillor");
    expect(tag("councillor-10", "Ausma Malik")).toBe("Incumbent");
  });

  it("carries the editor's background lines", () => {
    expect(candidateSetup(byId("councillor-13"), { candidacy_id: null, full_name: "Daniel Tate" })?.line).toBe("Right-wing Instagram influencer");
  });

  it("names the French boards' areas with their City ward number", () => {
    expect(byId("viamonde-3").title).toBe("Viamonde, Ward 3 (Centre)");
    expect(byId("tcdsb-6").acclaimed).toBe(true);
  });
});
