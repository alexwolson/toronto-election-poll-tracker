import { getWards } from "@/lib/api";
import { WardCard } from "@/components/ward-card";
import { Ward } from "@/types/ward";

export default async function WardsPage() {
  const data = await getWards();
  const wards = data.wards || [];
  
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">All Wards</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {wards.map((ward: Ward) => (
            <WardCard key={ward.ward} ward={ward} />
          ))}
        </div>
      </div>
    </main>
  );
}