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
    const res = await fetch(`${API_URL}/api/wards`, {
      next: { revalidate: 60 },
    });
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
  const fallback: WardResponse = {
    ward: null,
    challengers: [],
  };

  try {
    const res = await fetch(`${API_URL}/api/wards/${wardNum}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return fallback;
    return res.json();
  } catch (error) {
    console.error(`Failed to fetch ward ${wardNum}:`, error);
    return fallback;
  }
}

type PollTrendPoint = {
  date: string;
  [candidate: string]: number | string;
};

type ChowPressureBand = "low" | "moderate" | "elevated";
type ChowPressureTrend = "rising" | "flat" | "easing" | "insufficient";

type ChowPressurePayload = {
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
  aggregated: Record<string, number>;
  polls_used: number;
  total_polls_available: number;
  polls_with_non_scenario_candidates: number;
  candidates: string[];
  trend: PollTrendPoint[];
  chow_pressure: ChowPressurePayload;
  chow_structural_context: {
    score: number | null;
    source: string;
  };
};

export async function getPollingAverages(): Promise<PollingAveragesResponse> {
  const fallback: PollingAveragesResponse = {
    aggregated: {},
    polls_used: 0,
    total_polls_available: 0,
    polls_with_non_scenario_candidates: 0,
    candidates: [],
    trend: [],
    chow_pressure: {
      value: 0,
      band: "low",
      trend: "insufficient",
      methodology_version: "v1-fragmentation-adjusted-demand",
      computed_at: "",
      diagnostics: {
        adaptive_half_life_days: 21,
        adaptive_trend_horizon_days: 28,
        chow_share_std_recent: 0,
      },
    },
    chow_structural_context: {
      score: null,
      source: "",
    },
  };

  try {
    const res = await fetch(`${API_URL}/api/polls/latest`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return fallback;

    const data = (await res.json()) as Partial<PollingAveragesResponse>;
    return {
      aggregated: data.aggregated ?? {},
      polls_used: data.polls_used ?? 0,
      total_polls_available: data.total_polls_available ?? 0,
      polls_with_non_scenario_candidates: data.polls_with_non_scenario_candidates ?? 0,
      candidates: data.candidates ?? [],
      trend: data.trend ?? [],
      chow_pressure: data.chow_pressure ?? fallback.chow_pressure,
      chow_structural_context:
        data.chow_structural_context ?? fallback.chow_structural_context,
    };
  } catch (error) {
    console.error("Failed to fetch polling averages:", error);
    return fallback;
  }
}
