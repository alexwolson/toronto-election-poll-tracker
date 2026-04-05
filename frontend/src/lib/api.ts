const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function getWards() {
  const res = await fetch(`${API_URL}/api/wards`, { 
    next: { revalidate: 60 } 
  });
  if (!res.ok) throw new Error('Failed to fetch wards');
  return res.json();
}

export async function getWard(wardNum: number) {
  const res = await fetch(`${API_URL}/api/wards/${wardNum}`, {
    next: { revalidate: 60 }
  });
  if (!res.ok) throw new Error('Failed to fetch ward');
  return res.json();
}