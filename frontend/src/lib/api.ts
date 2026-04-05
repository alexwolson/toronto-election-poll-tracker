const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
import { WardsResponse, WardResponse } from '../types/ward';

export async function getWards(): Promise<WardsResponse> {
  const res = await fetch(`${API_URL}/api/wards`, { 
    next: { revalidate: 60 } 
  });
  if (!res.ok) throw new Error(`Failed to fetch wards: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function getWard(wardNum: number): Promise<WardResponse> {
  const res = await fetch(`${API_URL}/api/wards/${wardNum}`, {
    next: { revalidate: 60 }
  });
  if (!res.ok) throw new Error(`Failed to fetch ward ${wardNum}: ${res.status} ${res.statusText}`);
  return res.json();
}