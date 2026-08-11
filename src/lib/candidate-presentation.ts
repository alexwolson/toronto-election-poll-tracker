export const CANDIDATE_COLOURS: Record<string, string> = {
  chow: "#854A90",
  bradford: "#2E8B57",
  alexander: "#F8C466",
};

export const CANDIDATE_NAMES: Record<string, string> = {
  chow: "Olivia Chow",
  bradford: "Brad Bradford",
  alexander: "Chris Alexander",
};

export function candidateColour(id: string): string {
  return CANDIDATE_COLOURS[id] ?? "#94a3b8";
}

export function candidateName(id: string): string {
  return CANDIDATE_NAMES[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}

