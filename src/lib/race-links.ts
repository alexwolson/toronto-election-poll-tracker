/**
 * Every race's page from its payload id alone (results redesign, Alex, 2026-10-24), so the build,
 * the browser and the redirects in next.config.ts link alike. No imports: the Next config loads
 * this file before any path alias exists.
 */

/** Toronto's 25 wards, in order, as the Council feed names them (a test holds the two together). */
export const WARD_NAMES = [
  "Etobicoke North",
  "Etobicoke Centre",
  "Etobicoke-Lakeshore",
  "Parkdale-High Park",
  "York South-Weston",
  "York Centre",
  "Humber River-Black Creek",
  "Eglinton-Lawrence",
  "Davenport",
  "Spadina-Fort York",
  "University-Rosedale",
  "Toronto-St. Paul's",
  "Toronto Centre",
  "Toronto-Danforth",
  "Don Valley West",
  "Don Valley East",
  "Don Valley North",
  "Willowdale",
  "Beaches-East York",
  "Scarborough Southwest",
  "Scarborough Centre",
  "Scarborough-Agincourt",
  "Scarborough North",
  "Scarborough-Guildwood",
  "Scarborough-Rouge Park",
] as const;

/** A name as a URL path segment: "Toronto-St. Paul's" → "toronto-st-pauls". */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** A ward's page slug: "4" → "parkdale-high-park". */
export const wardSlug = (num: string) => slugify(WARD_NAMES[Number(num) - 1] ?? `ward-${num}`);

/** A race's page: the mayor's is the citywide page; the French boards' races share one page. */
export function raceHref(id: string): string {
  const [, kind, num] = id.match(/^([a-z]+)-(\d+)$/) ?? [];
  if (kind === "councillor") return `/${wardSlug(num)}/`;
  if (kind === "tdsb" || kind === "tcdsb") return `/${kind}/${num}/`;
  if (kind === "viamonde" || kind === "monavenir") return `/conseils-scolaires/#${id}`;
  return "/results/";
}

const RESULTS_PATHS = new Set(["/results", "/conseils-scolaires", ...WARD_NAMES.map((name) => `/${slugify(name)}`)]);

/** Whether a path is one of the results pages: the citywide page, a race's, or the French boards'. */
export function isResultsPath(pathname: string): boolean {
  const path = pathname.replace(/\/$/, "");
  return RESULTS_PATHS.has(path) || /^\/(tdsb|tcdsb)\/\d{1,2}$/.test(path);
}
