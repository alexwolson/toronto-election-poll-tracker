const DATA_REVISION = process.env.NEXT_PUBLIC_DATA_REVISION?.trim() || "main";
const DATA_BASE_URL = `https://raw.githubusercontent.com/alexwolson/toronto-election-poll-tracker-data/${DATA_REVISION}/data/processed`;

function dataUrl(file: string): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/${file}`;
  }
  return `${DATA_BASE_URL}/${file}`;
}

export type EvidenceAvailability = "available" | "unavailable";

export type EvidencePoint = {
  poll_id: string;
  date: string;
  firm: string;
  sample_size: number | null;
  residual: number;
  [candidate: string]: string | number | null;
};

export type EvidenceSlice = {
  availability: EvidenceAvailability;
  denominator: "poll_reported_vote_intention";
  candidates: Record<string, number>;
  residual: { id: "residual"; label: string; share: number | null };
  poll_count: number;
  firm_count: number;
  latest_date: string | null;
  series: EvidencePoint[];
};

export type ChallengerLane = {
  availability: EvidenceAvailability;
  combined_share: number | null;
  named_split: Record<string, number>;
  condition: "split" | "concentrated";
  trend: {
    status: "consolidating" | "fragmenting" | "stable" | "insufficient_data";
    change?: number;
    reason: string | null;
  };
  poll_count: number;
  latest_date: string | null;
};

export type ApprovalSlice = {
  availability: EvidenceAvailability;
  approve: number | null;
  disapprove: number | null;
  not_sure: number | null;
  unreported: number | null;
  reading_count: number;
  effective_reading_count: number;
  firm_count: number;
  latest_date: string | null;
  readings: {
    date: string;
    firm: string;
    methodology: string;
    approve: number;
    disapprove: number;
    not_sure: number;
    weight: number;
  }[];
};

export type ForecastStatus = "available" | "insufficient_data" | "unstable" | "error";

export type MayoralForecast = {
  status: ForecastStatus;
  unavailable_reasons: string[];
  model_version: string;
  election_date: string;
  data_cutoff?: string | null;
  candidates: Record<string, {
    projected_share: { median: number; low: number; high: number };
    win_probability: number;
  }>;
  residual: { id: "residual"; median: number; low: number; high: number } | null;
  diagnostics: {
    backtest?: Record<string, number | boolean>;
    convergence?: Record<string, number>;
    sensitivity?: {
      leader_stable: boolean;
      leader_probability_swing: number;
      scenarios?: Record<string, Record<string, number>>;
    };
    data_gate_passed?: boolean;
    poll_count?: number;
    firm_count?: number;
    field_count?: number;
  };
};

export type MayoralRace = {
  as_of: string;
  target_field: string[];
  current_field: EvidenceSlice;
  challenger_lane: ChallengerLane;
  head_to_head: EvidenceSlice;
  approval: ApprovalSlice;
  historical_context: {
    availability: EvidenceAvailability;
    definition?: string;
    chow_crowded_field_average?: number;
    range?: { low: number; high: number };
    poll_count: number;
  };
  poll_breakdown: {
    current_average: number;
    head_to_head: number;
    different_candidate_field: number;
    other: number;
    total: number;
  };
  forecast: MayoralForecast;
};

export type CandidateSummary = { id: string; name: string; summary: string };
export type CandidateStatus = Record<"declared" | "potential" | "declined", CandidateSummary[]>;

type RegisteredCandidate = {
  first_name: string;
  last_name: string;
  status: string;
  date_nomination: string;
};

export type PollHistoryItem = {
  poll_id: string;
  date_published: string;
  firm: string;
  sample_size: number;
  field_tested: string;
  candidates: Record<string, number>;
  excluded_from_current_average: boolean;
  use: "current_average" | "head_to_head" | "different_candidate_field" | "other";
};

export type PollingAveragesResponse = {
  schema_version: 2;
  mayoral_race: MayoralRace;
  total_polls_available: number;
  candidate_status: CandidateStatus;
  candidate_ranges: Record<string, Record<string, { min: number; max: number } | null>>;
  poll_history: PollHistoryItem[];
  registered_candidates: {
    mayors: RegisteredCandidate[];
    councillors: Record<string, RegisteredCandidate[]>;
  } | null;
};

function unavailableEvidence(): EvidenceSlice {
  return {
    availability: "unavailable",
    denominator: "poll_reported_vote_intention",
    candidates: {},
    residual: { id: "residual", label: "Other / undecided", share: null },
    poll_count: 0,
    firm_count: 0,
    latest_date: null,
    series: [],
  };
}

function unavailableRace(): MayoralRace {
  return {
    as_of: "",
    target_field: ["chow", "bradford", "alexander"],
    current_field: unavailableEvidence(),
    challenger_lane: {
      availability: "unavailable",
      combined_share: null,
      named_split: {},
      condition: "split",
      trend: { status: "insufficient_data", reason: "Current-field evidence is unavailable." },
      poll_count: 0,
      latest_date: null,
    },
    head_to_head: unavailableEvidence(),
    approval: {
      availability: "unavailable",
      approve: null,
      disapprove: null,
      not_sure: null,
      unreported: null,
      reading_count: 0,
      effective_reading_count: 0,
      firm_count: 0,
      latest_date: null,
      readings: [],
    },
    historical_context: { availability: "unavailable", poll_count: 0 },
    poll_breakdown: { current_average: 0, head_to_head: 0, different_candidate_field: 0, other: 0, total: 0 },
    forecast: {
      status: "error",
      unavailable_reasons: ["The version 2 mayoral snapshot is unavailable."],
      model_version: "unavailable",
      election_date: "2026-10-26",
      candidates: {},
      residual: null,
      diagnostics: {},
    },
  };
}

const fallback: PollingAveragesResponse = {
  schema_version: 2,
  mayoral_race: unavailableRace(),
  total_polls_available: 0,
  candidate_status: { declared: [], potential: [], declined: [] },
  candidate_ranges: { declared: {}, potential: {}, declined: {} },
  poll_history: [],
  registered_candidates: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parsePollingSnapshot(value: unknown): PollingAveragesResponse | null {
  if (!isRecord(value) || value.schema_version !== 2 || !isRecord(value.mayoral_race)) return null;
  const race = value.mayoral_race;
  if (
    !Array.isArray(race.target_field) ||
    !isRecord(race.current_field) ||
    !isRecord(race.head_to_head) ||
    !isRecord(race.approval) ||
    !isRecord(race.forecast) ||
    !Array.isArray(value.poll_history)
  ) return null;
  return value as PollingAveragesResponse;
}

export async function getPollingAverages(): Promise<PollingAveragesResponse> {
  try {
    const res = await fetch(
      dataUrl("polls_snapshot.json"),
      process.env.NEXT_PUBLIC_API_URL
        ? { cache: "no-store" }
        : { next: { revalidate: 3600 } }
    );
    if (!res.ok) return fallback;
    return parsePollingSnapshot(await res.json()) ?? fallback;
  } catch {
    return fallback;
  }
}
