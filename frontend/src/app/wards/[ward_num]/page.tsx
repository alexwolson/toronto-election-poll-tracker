import { getWard } from "@/lib/api";
import { Challenger } from "@/types/ward";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import {
  getVulnerabilityBand,
  getVulnerabilitySignals,
} from "@/lib/vulnerability";
import { VulnerabilityPill } from "@/components/vulnerability-pill";
import { getWardDisplayName } from "@/lib/ward-names";

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
  if (data.error === "not_found") {
    notFound();
  }

  if (!data.ward) {
    return (
      <main>
        <div className="civic-shell max-w-3xl">
          <Link href="/wards" className="text-sm text-muted-foreground hover:underline font-mono">
            ← All Wards
          </Link>
          <h1 className="mt-4 mb-2 text-4xl font-heading">Ward {wardNum}</h1>
          <div className="surface-panel p-4">
            <p className="font-medium">Ward data is temporarily unavailable.</p>
            <p className="text-sm text-muted-foreground mt-1">
              The backend API might be down or still loading. Please try again shortly.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const { ward, challengers } = data;
  const vulnerabilityBand = getVulnerabilityBand(ward.defeatability_score);
  const vulnerabilitySignals = getVulnerabilitySignals(ward);
  const displayName = ward.is_running ? ward.councillor_name : "Open seat";
  const wardLabel = getWardDisplayName(ward.ward);

  const arrowIcon = (direction: "up" | "down" | "flat") => {
    if (direction === "up") return ArrowUpRight;
    if (direction === "down") return ArrowDownRight;
    return ArrowRight;
  };

  return (
    <main>
      <div className="civic-shell max-w-4xl space-y-6">
        <Link href="/wards" className="text-sm text-muted-foreground hover:underline font-mono">
          ← All Wards
        </Link>

        <section className="surface-panel p-6 md:p-8">
          <p className="hero-kicker">Ward profile</p>
          <h1 className="mt-4 text-4xl font-heading md:text-5xl">{wardLabel}</h1>
          <p className="text-xl text-muted-foreground mt-2">
          {displayName}
          {ward.is_running && ward.is_byelection_incumbent && (
            <span className="ml-2 text-sm font-normal font-mono uppercase tracking-wider">(by-election incumbent)</span>
          )}
          </p>
        </section>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <div className="surface-panel p-5">
            <p className="text-sm text-muted-foreground">Vulnerability outlook</p>
            <div className="mt-2">
              <VulnerabilityPill band={vulnerabilityBand} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Derived from electorate depth, prior vote share, and growth pressure.</p>
          </div>
          <div className="surface-panel p-5">
            <p className="text-sm text-muted-foreground">Race class</p>
            <p className="mt-2 font-mono text-xs uppercase tracking-wider">{ward.race_class}</p>
          </div>
        </div>

        {ward.ward !== 19 && (
          <section>
            <h2 className="text-3xl font-heading mb-3">Vulnerability Signals</h2>
            <div className="surface-panel divide-y divide-[var(--line-soft)]">
              {vulnerabilitySignals.map((signal) => {
                const Icon = arrowIcon(signal.direction);
                const arrowClass =
                  signal.direction === "up"
                    ? "text-rose-700"
                    : signal.direction === "down"
                      ? "text-emerald-700"
                      : "text-amber-700";

                return (
                  <div key={signal.id} className="grid gap-2 px-4 py-3 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <p className="font-medium">{signal.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{signal.summary}</p>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
                      <span>{signal.valueLabel}</span>
                      <span className={`inline-flex items-center ${arrowClass}`}>
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {ward.is_running && (
          <section>
            <h2 className="text-3xl font-heading mb-3">Model Factors</h2>
            <div className="surface-panel divide-y divide-[var(--line-soft)] text-sm">
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
          </section>
        )}

        <section>
          <h2 className="text-3xl font-heading mb-3">
            Challengers{" "}
            <span className="text-sm font-normal text-muted-foreground font-mono uppercase tracking-wider">
              ({challengers.length})
            </span>
          </h2>
          {challengers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No challenger data entered yet.
            </p>
          ) : (
            <div className="surface-panel divide-y divide-[var(--line-soft)] text-sm">
              {challengers.map((c: Challenger) => (
                <div key={c.candidate_name} className="px-4 py-3">
                  <div className="flex justify-between">
                    <span className="font-medium">{c.candidate_name}</span>
                    <span className="text-muted-foreground capitalize font-mono text-xs uppercase tracking-wider">
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
        </section>
      </div>
    </main>
  );
}
