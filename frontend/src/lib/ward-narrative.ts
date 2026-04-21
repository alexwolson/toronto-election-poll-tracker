import type { Ward, Challenger } from "@/types/ward";

interface NarrativeSignal {
  sentence: string;
  riskDirection: "raises" | "reduces";
  canLowercase?: boolean;
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
    return {
      sentence: `${nameStr} has entered the race as a well-known challenger, adding meaningful pressure on ${councillorName}.`,
      riskDirection: "raises",
    };
  }

  if (named.length === 0) {
    return {
      sentence: "No challengers have registered yet, which keeps race pressure low for now.",
      riskDirection: "reduces",
    };
  }

  return null;
}

function scoreVoteShare(ward: Ward): NarrativeSignal | null {
  const vote = ward.vote_share;
  if (vote === undefined) return null;
  if (vote < 0.45) {
    return {
      sentence: `${ward.councillor_name}'s 2022 vote share was low — they won with a thin margin that leaves little buffer against a credible challenger.`,
      riskDirection: "raises",
      canLowercase: false,
    };
  }
  if (vote > 0.62) {
    return {
      sentence: `${ward.councillor_name}'s 2022 vote share was strong, giving them a wide cushion against most challengers.`,
      riskDirection: "reduces",
      canLowercase: false,
    };
  }
  return null;
}

function scoreCoattail(ward: Ward): NarrativeSignal | null {
  if (!ward.coattail_detail) return null;
  const { alignment, ward_lean } = ward.coattail_detail;

  const highAlignment = alignment > 0.7;
  const lowAlignment = alignment < 0.4;
  const positiveLean = ward_lean > 0.03;
  const negativeLean = ward_lean < -0.03;

  if (!highAlignment && !lowAlignment) return null;
  if (!positiveLean && !negativeLean) return null;

  if (highAlignment && positiveLean) {
    return {
      sentence:
        "They vote closely with Mayor Chow, and this ward has historically leaned toward Chow's coalition — a combination that could reinforce their support.",
      riskDirection: "reduces",
    };
  }
  if (highAlignment && negativeLean) {
    return {
      sentence:
        "They vote closely with Mayor Chow, but this ward has historically been cool toward Chow's coalition — an alignment that may not play to their advantage.",
      riskDirection: "raises",
    };
  }
  if (lowAlignment && positiveLean) {
    return {
      sentence:
        "They have kept distance from Mayor Chow's voting record, even though this ward has historically leaned toward Chow's coalition.",
      riskDirection: "raises",
    };
  }
  // lowAlignment && negativeLean
  return {
    sentence:
      "They have kept distance from Mayor Chow's voting record, which aligns with this ward's historically cool reception of Chow's coalition.",
    riskDirection: "reduces",
  };
}

function scoreElectorateShare(ward: Ward): NarrativeSignal | null {
  const e = ward.electorate_share;
  if (e === undefined) return null;
  if (e < 0.11) {
    return {
      sentence:
        "Their base is thin relative to the registered electorate — a challenger running a strong voter-drive could activate enough new voters to tip the result.",
      riskDirection: "raises",
    };
  }
  if (e > 0.18) {
    return {
      sentence:
        "Their vote penetrates broadly into the registered electorate, making it harder for a challenger to close the gap through voter mobilisation alone.",
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

  const scoreFns = [
    () => scoreChallenger(challengers, ward.councillor_name),
    () => scoreVoteShare(ward),
    () => scoreCoattail(ward),
    () => scoreElectorateShare(ward),
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
