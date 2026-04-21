export interface Factors {
  vuln: number;
  coat: number;
  chal: number;
}

export interface CoattailDetail {
  alignment: number;       // councillor's Chow alignment score (0–1)
  alignment_delta: number; // deviation from mean councillor alignment
  ward_lean: number;       // ward Chow lean vs city average
}

export interface Ward {
  ward: number;
  councillor_name: string;
  is_running: boolean;
  is_byelection_incumbent: boolean;
  defeatability_score: number;
  win_probability: number;
  win_probability_interval?: {
    low: number;
    high: number;
  };
  race_class: "safe" | "competitive" | "open";
  factors: Factors;
  coattail_detail?: CoattailDetail;
  candidate_win_probabilities?: Record<string, number>;
  vote_share?: number;
  electorate_share?: number;
  notes?: string;
  pop_growth_pct?: number;
}

export interface Challenger {
  ward: number;
  candidate_name: string;
  name_recognition_tier: "well-known" | "known" | "unknown";
  fundraising_tier: "high" | "low" | null;
  mayoral_alignment: string;
  is_endorsed_by_departing: boolean;
}

export interface PhaseInfo {
  phase: 1 | 2 | 3;
  label: string;
  description: string;
}

export interface WardsResponse {
  wards: Ward[];
  challengers: Challenger[];
  composition_mean: number;
  composition_std: number;
  composition_by_mayor: Record<
    string,
    {
      mean: number;
      std: number;
      n_draws: number;
    }
  >;
  mayoral_averages: Record<string, number>;
  phase: PhaseInfo;
  scenarios: Record<string, string[]>;
  default_scenario: string;
}

export interface WardResponse {
  ward: Ward | null;
  challengers: Challenger[];
  error?: "not_found" | "unavailable";
}
