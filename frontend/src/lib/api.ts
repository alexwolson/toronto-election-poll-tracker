import { WardsResponse, WardResponse } from '../types/ward';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function getWards(): Promise<WardsResponse> {
  const fallback: WardsResponse = {
    wards: [],
    challengers: [],
    composition_mean: 0,
    composition_std: 0,
    composition_by_mayor: {},
    mayoral_averages: {},
    phase: { phase: 1, label: "", description: "" },
    scenarios: {},
    default_scenario: "",
  };
  try {
    const res = await fetch(`${API_URL}/api/wards`, { next: { revalidate: 60 } });
    if (!res.ok) return fallback;
    const data = (await res.json()) as Partial<WardsResponse>;
    return {
      wards: data.wards ?? [],
      challengers: data.challengers ?? [],
      composition_mean: data.composition_mean ?? 0,
      composition_std: data.composition_std ?? 0,
      composition_by_mayor: data.composition_by_mayor ?? {},
      mayoral_averages: data.mayoral_averages ?? {},
      phase: data.phase ?? { phase: 1, label: "", description: "" },
      scenarios: data.scenarios ?? {},
      default_scenario: data.default_scenario ?? "",
    };
  } catch (error) {
    console.error("Failed to fetch wards:", error);
    return fallback;
  }
}

export async function getWard(wardNum: number): Promise<WardResponse> {
  const fallback: WardResponse = { ward: null, challengers: [], error: "unavailable" };
  try {
    const res = await fetch(`${API_URL}/api/wards/${wardNum}`, { next: { revalidate: 60 } });
    if (res.status === 404) return { ward: null, challengers: [], error: "not_found" };
    if (!res.ok) return fallback;
    const data = (await res.json()) as WardResponse;
    return { ward: data.ward ?? null, challengers: data.challengers ?? [] };
  } catch (error) {
    console.error(`Failed to fetch ward ${wardNum}:`, error);
    return fallback;
  }
}

export type ConsolidationTrend =
  | "consolidating"
  | "stalling"
  | "reversing"
  | "insufficient_data";

export type PoolModel = {
  phase_mode: "pre_nomination";
  phase_mode_context: string;
  pool: {
    chow_floor: number;
    chow_ceiling: number;
    anti_chow_pool: number;
    chow_h2h_current: number | null;
    protective_progressive_activated: number;
    protective_progressive_reserve: number;
  };
  candidates: Record<string, { share: number; capture_rate: number }>;
  withdrawn_in_transition: number;
  uncaptured_anti_chow: number;
  consolidation_trend: ConsolidationTrend;
  approval: { approve: number; disapprove: number; not_sure: number };
  data_notes: {
    full_field_poll_count: number;
    total_polls: number;
    approval_data_points: number;
    h2h_available: boolean;
  };
};

type PollTrendPoint = { date: string; [candidate: string]: number | string };

// Kept for backward compatibility with the polls page
export type ChowPressureBand = "low" | "moderate" | "elevated";
export type ChowPressureTrend = "rising" | "easing" | "flat" | "insufficient";
export type ChowPressure = {
  value: number;
  band: ChowPressureBand;
  trend: ChowPressureTrend;
  methodology_version: string;
  computed_at: string;
  diagnostics: {
    adaptive_half_life_days: number;
    adaptive_trend_horizon_days: number;
    chow_share_std_recent: number;
  };
};

type PollingAveragesResponse = {
  pool_model: PoolModel | null;
  aggregated: Record<string, number>;
  polls_used: number;
  candidates: string[];
  trend: PollTrendPoint[];
  total_polls_available: number;
  excluded_declined_polls: number;
  candidate_status: Record<string, { id: string; name: string; summary: string }[]>;
  candidate_ranges: Record<string, Record<string, { min: number; max: number } | null>>;
  poll_history: {
    poll_id: string;
    date_published: string;
    firm: string;
    sample_size: number;
    field_tested: string;
    excluded_from_model: boolean;
    excluded_reason: string | null;
  }[];
  chow_pressure: ChowPressure | null;
};

export async function getPollingAverages(): Promise<PollingAveragesResponse> {
  const fallback: PollingAveragesResponse = {
    pool_model: null,
    aggregated: {},
    polls_used: 0,
    candidates: [],
    trend: [],
    total_polls_available: 0,
    excluded_declined_polls: 0,
    candidate_status: { declared: [], potential: [], declined: [] },
    candidate_ranges: { declared: {}, potential: {}, declined: {} },
    poll_history: [],
    chow_pressure: null,
  };
  try {
    const res = await fetch(`${API_URL}/api/polls/latest`, { next: { revalidate: 60 } });
    if (!res.ok) return fallback;
    const data = (await res.json()) as Partial<PollingAveragesResponse>;
    return {
      pool_model: data.pool_model ?? null,
      aggregated: data.aggregated ?? {},
      polls_used: data.polls_used ?? 0,
      candidates: data.candidates ?? [],
      trend: data.trend ?? [],
      total_polls_available: data.total_polls_available ?? 0,
      excluded_declined_polls: data.excluded_declined_polls ?? 0,
      candidate_status: data.candidate_status ?? { declared: [], potential: [], declined: [] },
      candidate_ranges: data.candidate_ranges ?? { declared: {}, potential: {}, declined: {} },
      poll_history: data.poll_history ?? [],
      chow_pressure: data.chow_pressure ?? null,
    };
  } catch (error) {
    console.error("Failed to fetch polling averages:", error);
    return fallback;
  }
}
