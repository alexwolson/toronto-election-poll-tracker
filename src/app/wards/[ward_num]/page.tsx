import { getWard, getWards } from "@/lib/api";
import { Challenger } from "@/types/ward";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getVulnerabilityBand,
  getVulnerabilitySignals,
} from "@/lib/vulnerability";
import { VulnerabilityPill } from "@/components/vulnerability-pill";
import { SignalRangeBar } from "@/components/signal-range-bar";
import { CoattailBars } from "@/components/coattail-bars";
import { getWardDisplayName } from "@/lib/ward-names";
import { generateWardNarrative } from "@/lib/ward-narrative";

interface Props {
  params: Promise<{ ward_num: string }>;
}

// All three factors: negative value = increases risk, non-negative = reduces risk.
// (vuln < 0, coat < 0, chal < 0 are all red in the existing colour logic.)
function factorDirection(value: number): { label: string; color: string } {
  return value < 0
    ? { label: "↑ increases risk", color: "var(--vuln-high-fg)" }
    : { label: "↓ reduces risk", color: "var(--vuln-low-fg)" };
}

export default async function WardDetailPage({ params }: Props) {
  const { ward_num } = await params;
  const wardNum = parseInt(ward_num, 10);

  if (isNaN(wardNum) || wardNum < 1 || wardNum > 25) {
    notFound();
  }

  const [data, allWardsData] = await Promise.all([getWard(wardNum), getWards()]);
  if (data.error === "not_found") {
    notFound();
  }

  if (!data.ward) {
    return (
      <main className="np-shell" style={{ maxWidth: "48rem" }}>
        <Link
          href="/wards"
          className="font-mono"
          style={{ fontSize: "0.65rem", color: "var(--text-mid)", textTransform: "uppercase", letterSpacing: "0.08em", textDecoration: "none", display: "inline-block", marginBottom: "1.5rem" }}
        >
          ← All Wards
        </Link>
        <h1 className="font-heading" style={{ fontSize: "2rem", fontWeight: 700, color: "var(--text-strong)", marginBottom: "1rem" }}>
          Ward {wardNum}
        </h1>
        <div style={{ border: "1px solid var(--line-soft)", padding: "1rem" }}>
          <p style={{ fontWeight: 600 }}>Ward data is temporarily unavailable.</p>
          <p className="font-mono" style={{ fontSize: "0.65rem", color: "var(--text-mid)", marginTop: "0.5rem" }}>
            The backend API might be down. Please try again shortly.
          </p>
        </div>
      </main>
    );
  }

  const { ward, challengers } = data;
  const narrativeLede = generateWardNarrative(ward, challengers);
  const vulnerabilityBand = getVulnerabilityBand(ward.defeatability_score);
  const vulnerabilitySignals = getVulnerabilitySignals(ward);
  const displayName = ward.is_running ? ward.councillor_name : "Open seat";
  const wardLabel = getWardDisplayName(ward.ward);

  const allWards = allWardsData.wards;
  function signalRange(field: "vote_share" | "electorate_share" | "pop_growth_pct") {
    const vals = allWards.map((w) => w[field]).filter((v): v is number => v !== undefined);
    if (vals.length === 0) return { min: 0, max: 1 };
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }
  const signalRanges = {
    vote_share: { ...signalRange("vote_share"), minLabel: "more vulnerable", maxLabel: "less vulnerable", moreVulnerableSide: "min" as const },
    electorate_share: { ...signalRange("electorate_share"), minLabel: "more vulnerable", maxLabel: "less vulnerable", moreVulnerableSide: "min" as const },
    pop_growth_pct: { ...signalRange("pop_growth_pct"), minLabel: "less vulnerable", maxLabel: "more vulnerable", moreVulnerableSide: "max" as const },
  };
  const signalValues: Record<string, number | undefined> = {
    vote_share: ward.vote_share,
    electorate_share: ward.electorate_share,
    pop_growth_pct: ward.pop_growth_pct,
  };
  const toPercent = (v: number) => `${(v * 100).toFixed(1)}%`;

  function coattailRange(field: "ward_lean" | "alignment") {
    const vals = allWards
      .map((w) => w.coattail_detail?.[field])
      .filter((v): v is number => v !== undefined);
    if (vals.length === 0) return { min: 0, max: 1 };
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }
  const coattailRanges = {
    ward_lean: coattailRange("ward_lean"),
    alignment: coattailRange("alignment"),
  };

  return (
    <main className="np-shell" style={{ maxWidth: "52rem" }}>
      {/* Breadcrumb */}
      <Link
        href="/wards"
        className="np-back-link font-mono"
        style={{
          fontSize: "0.62rem",
          color: "var(--text-mid)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          textDecoration: "none",
          display: "inline-block",
          marginBottom: "1.5rem",
          padding: "0.2rem 0.4rem",
        }}
      >
        ← All Wards
      </Link>

      {/* Header */}
      <div className="np-kicker" style={{ marginBottom: "0.3rem" }}>
        Ward profile
      </div>
      <h1
        className="font-heading"
        style={{
          fontSize: "clamp(1.6rem, 4vw, 2.5rem)",
          fontWeight: 700,
          color: "var(--text-strong)",
          margin: "0 0 0.25rem 0",
          letterSpacing: "-0.01em",
        }}
      >
        {wardLabel}
      </h1>
      <p
        className="font-mono"
        style={{
          fontSize: "0.72rem",
          color: "var(--text-mid)",
          marginBottom: "0.75rem",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {displayName}
        {ward.is_running && ward.is_byelection_incumbent && (
          <span style={{ color: "var(--text-soft)" }}> · By-election incumbent</span>
        )}
      </p>
      <hr className="np-rule" />

      {narrativeLede && (
        <p
          className="font-heading"
          style={{
            fontSize: "0.92rem",
            lineHeight: 1.6,
            color: "var(--text-strong)",
            margin: "1.25rem 0 1.5rem 0",
          }}
        >
          {narrativeLede}
        </p>
      )}

      {/* Vulnerability */}
      <div
        style={{
          border: "1px solid var(--line-soft)",
          borderTop: "none",
          marginBottom: "2rem",
          padding: "0.75rem 1rem",
        }}
      >
        <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
          Vulnerability
        </div>
        {ward.is_running ? (
          <VulnerabilityPill band={vulnerabilityBand} />
        ) : (
          <span className="np-tag" style={{ color: "var(--vuln-open-fg)", borderColor: "var(--vuln-open-fg)" }}>Open seat</span>
        )}
      </div>

      {/* Signals & factors */}
      {ward.is_running && (
        <section style={{ marginBottom: "2rem" }}>
          <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
            Signals &amp; factors
          </div>
          <hr className="np-rule" />
          <table className="np-table">
            <tbody>
              {/* Vulnerability signals */}
              {vulnerabilitySignals.map((signal) => (
                <tr key={signal.id}>
                  <td>
                    <span className="font-heading" style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-strong)", display: "block" }}>
                      {signal.label}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-mid)", display: "block", marginTop: "0.25rem" }}>
                      {signal.explanation}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-faint)", display: "block", marginTop: "0.2rem" }}>
                      {signal.summary}
                    </span>
                  </td>
                  <td style={{ verticalAlign: "middle", paddingLeft: "1.5rem" }}>
                    <SignalRangeBar
                      value={signalValues[signal.id]}
                      min={signalRanges[signal.id].min}
                      max={signalRanges[signal.id].max}
                      formatValue={toPercent}
                      moreVulnerableSide={signalRanges[signal.id].moreVulnerableSide}
                      minLabel={signalRanges[signal.id].minLabel}
                      maxLabel={signalRanges[signal.id].maxLabel}
                    />
                  </td>
                </tr>
              ))}

              {/* Coattail effect */}
              {ward.is_running && ward.coattail_detail && (() => {
                const { alignment, ward_lean } = ward.coattail_detail;
                return (
                  <tr>
                    <td style={{ verticalAlign: "top" }}>
                      <span className="font-heading" style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-strong)", display: "block" }}>
                        Coattail effect
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-mid)", display: "block", marginTop: "0.25rem" }}>
                        Mayors tend to help or hurt councillors who share their political brand. This factor captures how closely the councillor votes with Mayor Chow and how strongly Chow&rsquo;s coalition performs in this ward.
                      </span>
                    </td>
                    <td style={{ verticalAlign: "top", paddingLeft: "1.5rem" }}>
                      <CoattailBars
                        wardLean={ward_lean}
                        leanMin={coattailRanges.ward_lean.min}
                        leanMax={coattailRanges.ward_lean.max}
                        alignment={alignment}
                        alignMin={coattailRanges.alignment.min}
                        alignMax={coattailRanges.alignment.max}
                      />
                    </td>
                  </tr>
                );
              })()}

              {/* Challenger effect */}
              {ward.is_running && (() => {
                const named = challengers.filter((c: Challenger) => c.candidate_name !== "Generic Challenger");
                const wellKnown = named.filter((c: Challenger) => c.name_recognition_tier === "well-known");
                const known = named.filter((c: Challenger) => c.name_recognition_tier === "known");
                const chalText =
                  named.length === 0 ? "No challengers registered yet; minimal pressure modelled" :
                  wellKnown.length > 0 ? `${wellKnown.length > 1 ? "Multiple" : "One"} well-known challenger${wellKnown.length > 1 ? "s" : ""} registered: ${wellKnown.map((c: Challenger) => c.candidate_name).join(" and ")}` :
                  known.length > 0 ? `Known challenger${known.length > 1 ? "s" : ""} registered (${known.map((c: Challenger) => c.candidate_name).join(" and ")}); no high-profile entrants yet` :
                  `${named.length} low-profile challenger${named.length > 1 ? "s" : ""} registered; no named threats yet`;
                const dir = factorDirection(ward.factors.chal);
                return (
                  <tr>
                    <td>
                      <span className="font-heading" style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-strong)", display: "block" }}>
                        Challenger effect
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-mid)", display: "block", marginTop: "0.25rem" }}>
                        The strength of the strongest announced challenger, based on name recognition and fundraising. Well-known challengers with resources apply significantly more pressure than low-profile entries.
                      </span>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-faint)", display: "block", marginTop: "0.2rem" }}>
                        {chalText}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", verticalAlign: "top" }}>
                      <span className="font-mono" style={{ fontSize: "0.72rem", color: dir.color }}>{dir.label}</span>
                    </td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </section>
      )}

      {/* Challengers */}
      <section>
        <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
          Challengers{" "}
          <span style={{ color: "var(--text-soft)" }}>({challengers.length})</span>
        </div>
        <hr className="np-rule" />
        {challengers.length === 0 ? (
          <p className="font-mono" style={{ fontSize: "0.65rem", color: "var(--text-soft)", padding: "0.75rem 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            No challenger data entered yet.
          </p>
        ) : (
          <table className="np-table">
            <tbody>
              {challengers.map((c: Challenger) => (
                <tr key={c.candidate_name}>
                  <td>
                    <span className="font-heading" style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-strong)", display: "block" }}>
                      {c.candidate_name}
                      {c.is_endorsed_by_departing && (
                        <span style={{ color: "var(--vuln-low-line-hover)", marginLeft: "0.4rem" }}>★</span>
                      )}
                    </span>
                    <span className="font-mono" style={{ fontSize: "0.6rem", color: "var(--text-mid)" }}>
                      Aligned: {c.mayoral_alignment}
                      {c.fundraising_tier && ` · Fundraising: ${c.fundraising_tier}`}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", verticalAlign: "top" }}>
                    <span className="np-tag" style={{ color: "var(--text-mid)" }}>
                      {c.name_recognition_tier}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
