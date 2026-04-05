const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
import { WardsResponse, WardResponse } from '../types/ward';

export async function getWards(): Promise<WardsResponse> {
  try {
    const res = await fetch(`${API_URL}/api/wards`, { 
      next: { revalidate: 60 } 
    });
    if (!res.ok) return { wards: [] };
    return res.json();
  } catch (error) {
    console.error("Failed to fetch wards:", error);
    return { wards: [] };
  }
}

export async function getWard(wardNum: number): Promise<WardResponse> {
  try {
    const res = await fetch(`${API_URL}/api/wards/${wardNum}`, {
      next: { revalidate: 60 }
    });
    if (!res.ok) return { ward: null as any };
    return res.json();
  } catch (error) {
    console.error(`Failed to fetch ward ${wardNum}:`, error);
    return { ward: null as any };
  }
}