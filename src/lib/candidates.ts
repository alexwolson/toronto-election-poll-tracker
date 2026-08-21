/**
 * Candidate display registry (spec §Candidate palette). Names, palette CSS
 * variable, and whether the fill is a hatch pattern (Alexander's gold reads as a
 * pattern, not a solid). Unknown ids fall back to a title-cased name and the
 * neutral "disengaged" colour so historical/minor candidates still render.
 */

export interface CandidateMeta {
  id: string;
  name: string;
  /** e.g. "chow" — used for CSS class suffixes like `--chow` */
  slug: string;
  /** e.g. "var(--color-chow)" */
  colorVar: string;
  hatch: boolean;
}

interface Known {
  name: string;
  slug: string;
  hatch: boolean;
}

const REGISTRY: Record<string, Known> = {
  chow: { name: "Olivia Chow", slug: "chow", hatch: false },
  bradford: { name: "Brad Bradford", slug: "bradford", hatch: false },
  alexander: { name: "Chris Alexander", slug: "alexander", hatch: true },
};

function titleCase(id: string): string {
  return id
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function candidateMeta(id: string): CandidateMeta {
  const known = REGISTRY[id];
  if (known) {
    return { id, colorVar: `var(--color-${known.slug})`, ...known };
  }
  return {
    id,
    name: titleCase(id),
    slug: "disengaged",
    colorVar: "var(--color-disengaged)",
    hatch: false,
  };
}

export function candidateName(id: string): string {
  return candidateMeta(id).name;
}
