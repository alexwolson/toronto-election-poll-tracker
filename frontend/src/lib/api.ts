import { WardsResponse, WardResponse } from '../types/ward';

// In production, data is served as static JSON built by scripts/build_snapshot.py.
// In development, fall back to the local FastAPI backend.
function dataUrl(file: string): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return `${process.env.NEXT_PUBLIC_API_URL}/api/${file}`;
  }
  if (typeof window === 'undefined') {
    // Server-side: use absolute URL via the static file
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    return `${base}/data/${file}`;
  }
  return `/data/${file}`;
}

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
    const res = await fetch(dataUrl('model_snapshot.json'), { next: { revalidate: 3600 } });
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
    const res = await fetch(dataUrl('model_snapshot.json'), { next: { revalidate: 3600 } });
    if (!res.ok) return fallback;
    const snapshot = (await res.json()) as { wards: NonNullable<WardResponse['ward']>[]; challengers: WardResponse['challengers'] };
    const ward = snapshot.wards?.find((w) => w.ward === wardNum) ?? null;
    if (!ward) return { ward: null, challengers: [], error: "not_found" };
    const challengers = (snapshot.challengers ?? []).filter(
      (c) => c.ward === wardNum && c.candidate_name !== "Generic Challenger"
    );
    return { ward, challengers };
  } catch (error) {
    console.error(`Failed to fetch ward ${wardNum}:`, error);
    return fallback;
  }
}

type ApprovalPollRow = {
  date: string;
  firm: string;
  approve: number;
  disapprove: number;
  not_sure: number;
  weight: number;
};

type FloorPollRow = {
  date: string;
  firm: string;
  field_tested: string;
  chow: number;
  sample_size: number;
  candidate_weight: number;
};

type H2HPollRow = {
  date: string;
  firm: string;
  chow: number;
  bradford: number;
  sample_size: number;
  recency_weight: number;
};

type CapturePollRow = {
  date: string;
  firm: string;
  field_tested: string;
  bradford: number;
  recency_weight: number;
};

export type PollDetail = {
  approval_polls: ApprovalPollRow[];
  floor_polls: FloorPollRow[];
  h2h_polls: H2HPollRow[];
  capture_polls: CapturePollRow[];
};

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
  uncaptured_anti_chow: number;
  consolidation_trend: ConsolidationTrend;
  approval: { approve: number; disapprove: number; not_sure: number };
  data_notes: {
    full_field_poll_count: number;
    total_polls: number;
    approval_data_points: number;
    h2h_available: boolean;
  };
  poll_detail: PollDetail;
};

type PollTrendPoint = { date: string; [candidate: string]: number | string };

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
    const res = await fetch(dataUrl('polls_snapshot.json'), { next: { revalidate: 3600 } });
    if (!res.ok) return fallback;
    const data = (await res.json()) as Partial<PollingAveragesResponse>;
    return {
      pool_model: data.pool_model
        ? {
            ...data.pool_model,
            poll_detail: data.pool_model.poll_detail ?? {
              approval_polls: [],
              floor_polls: [],
              h2h_polls: [],
              capture_polls: [],
            },
          }
        : null,
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
