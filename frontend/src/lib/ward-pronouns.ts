export interface Pronouns {
  subject: string;    // "he", "she", "they"
  object: string;     // "him", "her", "them"
  possessive: string; // "his", "her", "their"
  pluralVerb: boolean; // true for "they vote", false for "he/she votes"
}

const HE: Pronouns  = { subject: "he",   object: "him", possessive: "his", pluralVerb: false };
const SHE: Pronouns = { subject: "she",  object: "her", possessive: "her", pluralVerb: false };
const THEY: Pronouns = { subject: "they", object: "them", possessive: "their", pluralVerb: true };

// Keyed by ward number (1–25). Fill in per councillor; unset wards default to they/them/their.
const PRONOUNS: Record<number, Pronouns> = {
  // 1:  HE,
  // 2:  SHE,
  // …
};

export function getPronounsForWard(wardNum: number): Pronouns {
  return PRONOUNS[wardNum] ?? THEY;
}
