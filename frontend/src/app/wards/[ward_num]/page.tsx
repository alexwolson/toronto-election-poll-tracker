import { getWard } from "@/lib/api";
import { Challenger } from "@/types/ward";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ ward_num: string }>;
}

export default async function WardDetailPage({ params }: Props) {
  const { ward_num } = await params;
  const wardNum = parseInt(ward_num, 10);

  if (isNaN(wardNum) || wardNum < 1 || wardNum > 25) {
    notFound();
  }

  const data = await getWard(wardNum);
  if (!data.ward) notFound();

  const { ward, challengers } = data;
  const winPct = ward.is_running
    ? `${(ward.win_probability * 100).toFixed(1)}%`
    : "—";

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8 max-w-2xl">
        <a href="/wards" className="text-sm text-muted-foreground hover:underline">
          ← All Wards
        </a>

        <h1 className="text-3xl font-bold mt-4 mb-1">Ward {ward.ward}</h1>
        <p className="text-xl text-muted-foreground mb-6">
          {ward.councillor_name}
          {ward.is_byelection_incumbent && (
            <span className="ml-2 text-sm font-normal">(by-election incumbent)</span>
          )}
        </p>

        <div className="grid gap-4 grid-cols-2 mb-8">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Win Probability</p>
            <p className="text-2xl font-bold">{winPct}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Defeatability Score</p>
            <p className="text-2xl font-bold">{ward.defeatability_score}</p>
          </div>
        </div>

        {ward.is_running && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Model Factors</h2>
            <div className="rounded-lg border divide-y text-sm">
              <div className="flex justify-between px-4 py-2">
                <span className="text-muted-foreground">Vulnerability effect</span>
                <span className={ward.factors.vuln < 0 ? "text-red-600" : "text-green-600"}>
                  {ward.factors.vuln.toFixed(3)}
                </span>
              </div>
              <div className="flex justify-between px-4 py-2">
                <span className="text-muted-foreground">Coattail effect</span>
                <span className={ward.factors.coat >= 0 ? "text-green-600" : "text-red-600"}>
                  {ward.factors.coat.toFixed(3)}
                </span>
              </div>
              <div className="flex justify-between px-4 py-2">
                <span className="text-muted-foreground">Challenger effect</span>
                <span className={ward.factors.chal < 0 ? "text-red-600" : "text-green-600"}>
                  {ward.factors.chal.toFixed(3)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold mb-3">
            Challengers{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({challengers.length})
            </span>
          </h2>
          {challengers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No challenger data entered yet.
            </p>
          ) : (
            <div className="rounded-lg border divide-y text-sm">
              {challengers.map((c: Challenger) => (
                <div key={c.candidate_name} className="px-4 py-3">
                  <div className="flex justify-between">
                    <span className="font-medium">{c.candidate_name}</span>
                    <span className="text-muted-foreground capitalize">
                      {c.name_recognition_tier}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-0.5 flex gap-4">
                    <span>Aligned: {c.mayoral_alignment}</span>
                    {c.fundraising_tier && (
                      <span>Fundraising: {c.fundraising_tier}</span>
                    )}
                    {c.is_endorsed_by_departing && (
                      <span className="text-green-700 font-medium">★ Endorsed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
