export interface Factors {
  vuln: number;
  coat: number;
  chal: number;
}

export interface Ward {
  ward: number;
  councillor_name: string;
  is_running: boolean;
  is_byelection_incumbent: boolean;
  defeatability_score: number;
  win_probability: number;
  race_class: "safe" | "competitive" | "open";
  factors: Factors;
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
  mayoral_averages: Record<string, number>;
  phase: PhaseInfo;
}

export interface WardResponse {
  ward: Ward;
  challengers: Challenger[];
}
