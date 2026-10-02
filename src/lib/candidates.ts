/**
 * Candidate display registry (spec §Candidate palette). Names, palette CSS
 * variable, and whether the fill is a hatch pattern. Palette values are defined
 * once in globals.css. Unknown ids fall back to a title-cased name and the
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
  per_a4291ca7539b53e2acc1c4f108bc73e6: {
    name: "Olivia Chow",
    slug: "chow",
    hatch: false,
  },
  bradford: { name: "Brad Bradford", slug: "bradford", hatch: false },
  per_d8dfddfb642358e299f4b428292666bf: {
    name: "Brad Bradford",
    slug: "bradford",
    hatch: false,
  },
  alexander: { name: "Chris Alexander", slug: "alexander", hatch: false },
  per_345dd6a9ee645c0bb5a8ade615f91579: {
    name: "Chris Alexander",
    slug: "alexander",
    hatch: false,
  },
  "sarah-mcvie": { name: "Sarah McVie", slug: "mcvie", hatch: false },
  per_95cd5c92c035574ab823643b45e8a5ae: {
    name: "Sarah McVie",
    slug: "mcvie",
    hatch: false,
  },
  "odessa-paloma-parker": { name: "Odessa Paloma Parker", slug: "parker", hatch: false },
  per_56060d2725565733b8f3a78855fc0c25: {
    name: "Odessa Paloma Parker",
    slug: "parker",
    hatch: false,
  },
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
