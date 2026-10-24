// Local review only (Alex, 2026-10-24): the Mock Feed's counts favour names early in the alphabet,
// which flags most council races. This writes fixtures/live/mock-night-reordered/, the same night
// with every vote total kept and moved so the editor's featured candidates (council) and running
// incumbents (trustees) hold the top places, as the approved prototype showed it. Ranges and the
// night's history follow their candidates. The mayor is left as generated.
// Usage: node scripts/reorder-mock-night.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const root = new URL("..", import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), "utf8"));
const payload = read("fixtures/live/mock-night/payload.json");
const history = read("fixtures/live/mock-night/history.json");
const editorial = read("src/data/editorial-races.json");
const trustees = read("fixtures/trustee_race_cards.json");

const incumbents = {};
for (const board of trustees.boards) {
  for (const ward of board.wards) incumbents[`${board.board_id}-${ward.ward_id}`] = ward.candidates.filter((c) => c.is_incumbent).map((c) => c.display_name);
}
const featuredFor = (race) => {
  if (race.level === "council") {
    const ed = editorial.council[race.num];
    return ed ? [...(ed.featured ?? []), ...(ed.outside ?? [])] : [];
  }
  return incumbents[race.id] ?? [];
};
const IDENTITY = ["key", "full_name", "short_label", "candidacy_id", "candidate_id"];
const renames = {};

for (const race of payload.races) {
  if (race.level === "mayor") continue;
  const featured = featuredFor(race);
  if (!featured.length) continue;
  const byVotes = [...race.candidates].sort((a, b) => (b.votes ?? -1) - (a.votes ?? -1));
  const want = featured.map((n) => byVotes.find((c) => c.full_name === n)).filter(Boolean);
  const target = [...want, ...byVotes.filter((c) => !want.includes(c))];
  const ident = target.map((c) => Object.fromEntries(IDENTITY.map((k) => [k, c[k]])));
  const rename = Object.fromEntries(byVotes.map((c, i) => [c.key, ident[i].key]));
  byVotes.forEach((c, i) => Object.assign(c, ident[i]));
  race.candidates = byVotes;
  const remap = (o) => o && Object.fromEntries(Object.entries(o).map(([k, v]) => [rename[k] ?? k, v]));
  race.possible = remap(race.possible);
  if (race.projection?.bands) race.projection.bands = Object.fromEntries(Object.entries(race.projection.bands).map(([k, v]) => [k, remap(v)]));
  renames[race.id] = remap;
}
for (const entry of history) {
  for (const [id, h] of Object.entries(entry.races ?? {})) {
    const remap = renames[id];
    if (!remap) continue;
    for (const field of Object.keys(h)) if (h[field] && typeof h[field] === "object" && !Array.isArray(h[field])) h[field] = remap(h[field]);
  }
}
const out = new URL("fixtures/live/mock-night-reordered/", root);
mkdirSync(out, { recursive: true });
writeFileSync(new URL("payload.json", out), `${JSON.stringify(payload)}\n`);
writeFileSync(new URL("history.json", out), `${JSON.stringify(history)}\n`);
console.log(`reordered ${Object.keys(renames).length} races`);
