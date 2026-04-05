export interface Challenger {
  id?: number;
  ward: number;
  name: string;
  is_running?: boolean;
}

export interface Ward {
  ward: number;
  councillor_name: string;
  is_running: boolean;
  defeatability_score: number;
}

export interface WardsResponse {
  wards: Ward[];
  challengers: Challenger[];
}

export interface WardResponse {
  ward: Ward;
  challengers: Challenger[];
}
