import type { Ward, Challenger } from "@/types/ward";
import { getPronounsForWard, type Pronouns } from "@/lib/ward-pronouns";

interface NarrativeSignal {
  sentence: string;
  riskDirection: "raises" | "reduces";
  canLowercase?: boolean;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function conjugate(verb: string, plural: boolean): string {
  if (plural) return verb;
  if (verb === "have") return "has";
  return verb + "s";
}

function scoreChallenger(challengers: Challenger[], councillorName: string): NarrativeSignal | null {
  const named = challengers.filter((c) => c.candidate_name !== "Generic Challenger");
  const wellKnown = named.filter((c) => c.name_recognition_tier === "well-known");

  if (wellKnown.length > 0) {
    const names = wellKnown.map((c) => c.candidate_name);
    const nameStr =
      names.length === 1
        ? names[0]
        : names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
    const verb = wellKnown.length === 1 ? "has" : "have";
    const noun = wellKnown.length === 1 ? "a well-known challenger" : "well-known challengers";
    return {
      sentence: `${nameStr} ${verb} entered the race as ${noun}, adding meaningful pressure on ${councillorName}.`,
      riskDirection: "raises",
      canLowercase: false,
    };
  }

  if (named.length === 0) {
    return {
      sentence: "No challengers have registered yet, which keeps race pressure low for now.",
      riskDirection: "reduces",
      canLowercase: false,
    };
  }

  return null;
}

function scoreVoteShare(ward: Ward, p: Pronouns): NarrativeSignal | null {
  const vote = ward.vote_share;
  if (vote === undefined) return null;
  if (vote < 0.45) {
    return {
      sentence: `${ward.councillor_name}'s 2022 vote share was low — ${p.subject} won with a thin margin that leaves little buffer against a credible challenger.`,
      riskDirection: "raises",
      canLowercase: false,
    };
  }
  if (vote > 0.62) {
    return {
      sentence: `${ward.councillor_name}'s 2022 vote share was strong, giving ${p.object} a wide cushion against most challengers.`,
      riskDirection: "reduces",
      canLowercase: false,
    };
  }
  return null;
}

function scoreCoattail(ward: Ward, p: Pronouns): NarrativeSignal | null {
  if (!ward.coattail_detail) return null;
  const { alignment, ward_lean } = ward.coattail_detail;

  const highAlignment = alignment > 0.7;
  const lowAlignment = alignment < 0.4;
  const positiveLean = ward_lean > 0.03;
  const negativeLean = ward_lean < -0.03;

  if (!highAlignment && !lowAlignment) return null;
  if (!positiveLean && !negativeLean) return null;

  const votes = conjugate("vote", p.pluralVerb);
  const has = conjugate("have", p.pluralVerb);

  if (highAlignment && positiveLean) {
    return {
      sentence:
        `${cap(p.subject)} ${votes} closely with Mayor Chow, and this ward has historically leaned toward Chow's coalition — a combination that could reinforce ${p.possessive} support.`,
      riskDirection: "reduces",
    };
  }
  if (highAlignment && negativeLean) {
    return {
      sentence:
        `${cap(p.subject)} ${votes} closely with Mayor Chow, but this ward has historically been cool toward Chow's coalition — an alignment that may not play to ${p.possessive} advantage.`,
      riskDirection: "raises",
    };
  }
  if (lowAlignment && positiveLean) {
    return {
      sentence:
        `${cap(p.subject)} ${has} kept distance from Mayor Chow's voting record, even though this ward has historically leaned toward Chow's coalition.`,
      riskDirection: "raises",
    };
  }
  // lowAlignment && negativeLean
  return {
    sentence:
      `${cap(p.subject)} ${has} kept distance from Mayor Chow's voting record, which aligns with this ward's historically cool reception of Chow's coalition.`,
    riskDirection: "reduces",
  };
}

function scoreElectorateShare(ward: Ward, p: Pronouns): NarrativeSignal | null {
  const e = ward.electorate_share;
  if (e === undefined) return null;
  if (e < 0.11) {
    return {
      sentence:
        `${cap(p.possessive)} base is thin relative to the registered electorate — a challenger running a strong voter-drive could activate enough new voters to tip the result.`,
      riskDirection: "raises",
    };
  }
  if (e > 0.18) {
    return {
      sentence:
        `${cap(p.possessive)} vote penetrates broadly into the registered electorate, making it harder for a challenger to close the gap through voter mobilisation alone.`,
      riskDirection: "reduces",
    };
  }
  return null;
}

function scorePopGrowth(ward: Ward): NarrativeSignal | null {
  const g = ward.pop_growth_pct;
  if (g === undefined) return null;
  if (g > 0.03) {
    return {
      sentence:
        "The ward has grown rapidly since 2021, adding a large pool of new residents the councillor has never won.",
      riskDirection: "raises",
    };
  }
  if (g < -0.01) {
    return {
      sentence:
        "A stable or shrinking voter base reduces the new-voter volatility that challengers typically exploit.",
      riskDirection: "reduces",
    };
  }
  return null;
}

function pickConnective(prev: NarrativeSignal, next: NarrativeSignal): string {
  if (prev.riskDirection === next.riskDirection) {
    return prev.riskDirection === "raises" ? "On top of that, " : "Adding to this, ";
  }
  return next.riskDirection === "raises" ? "However, " : "That said, ";
}

export function generateWardNarrative(ward: Ward, challengers: Challenger[]): string | null {
  if (!ward.is_running) return null;

  const p = getPronounsForWard(ward.ward);

  const scoreFns = [
    // challenger signal re-enabled after May 1 registration deadline
    // () => scoreChallenger(challengers, ward.councillor_name),
    () => scoreVoteShare(ward, p),
    () => scoreCoattail(ward, p),
    () => scoreElectorateShare(ward, p),
    () => scorePopGrowth(ward),
  ];

  const notable: NarrativeSignal[] = [];
  for (const fn of scoreFns) {
    if (notable.length >= 3) break;
    const result = fn();
    if (result) notable.push(result);
  }

  if (notable.length < 2) return null;

  const sentences: string[] = [notable[0].sentence];
  for (let i = 1; i < notable.length; i++) {
    const connective = pickConnective(notable[i - 1], notable[i]);
    const sig = notable[i];
    const raw = sig.sentence;
    const lowered =
      sig.canLowercase === false ? raw : raw.charAt(0).toLowerCase() + raw.slice(1);
    sentences.push(connective + lowered);
  }

  return sentences.join(" ");
}
