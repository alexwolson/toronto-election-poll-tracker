import { WardsResponse, WardResponse } from '../types/ward';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function getWards(): Promise<WardsResponse> {
  try {
    const res = await fetch(`${API_URL}/api/wards`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { wards: [], challengers: [], composition_mean: 0, composition_std: 0, mayoral_averages: {}, phase: { phase: 1, label: "", description: "" } };
    return res.json();
  } catch (error) {
    console.error("Failed to fetch wards:", error);
    return { wards: [], challengers: [], composition_mean: 0, composition_std: 0, mayoral_averages: {}, phase: { phase: 1, label: "", description: "" } };
  }
}

export async function getWard(wardNum: number): Promise<WardResponse> {
  try {
    const res = await fetch(`${API_URL}/api/wards/${wardNum}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { ward: null as any, challengers: [] };
    return res.json();
  } catch (error) {
    console.error(`Failed to fetch ward ${wardNum}:`, error);
    return { ward: null as any, challengers: [] };
  }
}

export async function getPollingAverages(): Promise<{ aggregated: Record<string, number>; polls_used: number }> {
  try {
    const res = await fetch(`${API_URL}/api/polls/latest`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { aggregated: {}, polls_used: 0 };
    return res.json();
  } catch (error) {
    console.error("Failed to fetch polling averages:", error);
    return { aggregated: {}, polls_used: 0 };
  }
}
