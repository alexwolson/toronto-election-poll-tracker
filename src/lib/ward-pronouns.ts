export interface Pronouns {
  subject: string;    // "he", "she", "they"
  object: string;     // "him", "her", "them"
  possessive: string; // "his", "her", "their"
  pluralVerb: boolean; // true for "they vote", false for "he/she votes"
}

const HE: Pronouns  = { subject: "he",   object: "him", possessive: "his", pluralVerb: false };
const SHE: Pronouns = { subject: "she",  object: "her", possessive: "her", pluralVerb: false };
const THEY: Pronouns = { subject: "they", object: "them", possessive: "their", pluralVerb: true };

// Keyed by ward number (1–25). Unset wards default to they/them/their.
const PRONOUNS: Record<number, Pronouns> = {
  1:  HE,   // Vincent Crisanti
  2:  HE,   // Stephen Holyday
  3:  SHE,  // Amber Morley
  4:  HE,   // Gord Perks
  5:  SHE,  // Frances Nunziata
  6:  HE,   // James Pasternak
  7:  HE,   // Anthony Perruzza
  8:  HE,   // Mike Colle
  9:  SHE,  // Alejandra Bravo
  10: SHE,  // Ausma Malik
  11: SHE,  // Dianne Saxe
  12: HE,   // Josh Matlow
  13: HE,   // Chris Moise
  14: SHE,  // Paula Fletcher
  15: SHE,  // Rachel Chernos Lin
  16: HE,   // Jon Burnside
  17: SHE,  // Shelley Carroll
  18: SHE,  // Lily Cheng
  19: HE,   // Brad Bradford
  20: HE,   // Parthi Kandavel
  21: HE,   // Michael Thompson
  22: HE,   // Nick Mantas
  23: HE,   // Jamaal Myers
  24: HE,   // Paul Ainslie
  25: HE,   // Neethan Shan
};

export function getPronounsForWard(wardNum: number): Pronouns {
  return PRONOUNS[wardNum] ?? THEY;
}
