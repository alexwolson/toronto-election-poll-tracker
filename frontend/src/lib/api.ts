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
    error: "unavailable",
  };

  try {
    const res = await fetch(`${API_URL}/api/wards/${wardNum}`, {
      next: { revalidate: 60 },
    });

    if (res.status === 404) {
      return { ward: null, challengers: [], error: "not_found" };
    }

    if (!res.ok) return fallback;

    const data = (await res.json()) as WardResponse;
    return {
      ward: data.ward ?? null,
      challengers: data.challengers ?? [],
    };
  } catch (error) {
    console.error(`Failed to fetch ward ${wardNum}:`, error);
    return fallback;
  }
}

type PollTrendPoint = {
  date: string;
  [candidate: string]: number | string;
};

type PollingAveragesResponse = {
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
};

export async function getPollingAverages(): Promise<PollingAveragesResponse> {
  const fallback: PollingAveragesResponse = {
    aggregated: {},
    polls_used: 0,
    candidates: [],
    trend: [],
    total_polls_available: 0,
    excluded_declined_polls: 0,
    candidate_status: { declared: [], potential: [], declined: [] },
    candidate_ranges: { declared: {}, potential: {}, declined: {} },
    poll_history: [],
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
      candidates: data.candidates ?? [],
      trend: data.trend ?? [],
      total_polls_available: data.total_polls_available ?? 0,
      excluded_declined_polls: data.excluded_declined_polls ?? 0,
      candidate_status: data.candidate_status ?? { declared: [], potential: [], declined: [] },
      candidate_ranges: data.candidate_ranges ?? { declared: {}, potential: {}, declined: {} },
      poll_history: data.poll_history ?? [],
    };
  } catch (error) {
    console.error("Failed to fetch polling averages:", error);
    return fallback;
  }
}
