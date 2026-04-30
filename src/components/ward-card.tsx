import Link from "next/link";
import { Ward } from "@/types/ward";
import { getVulnerabilityBand } from "@/lib/vulnerability";
import { VulnerabilityPill } from "@/components/vulnerability-pill";
import { getWardDisplayName } from "@/lib/ward-names";

interface WardCardProps {
  ward: Ward;
}

const TOP_BORDER: Record<string, string> = {
  high:   "2px solid var(--vuln-high-line)",
  medium: "2px solid var(--vuln-med-line)",
  low:    "1px solid var(--line-soft)",
};

export function WardCard({ ward }: WardCardProps) {
  const vulnerabilityBand = getVulnerabilityBand(ward.defeatability_score);
  const titleName = ward.is_running ? ward.councillor_name : "Open seat";
  const wardLabel = getWardDisplayName(ward.ward);
  const wardNum = String(ward.ward).padStart(2, "0");
  const borderTop = ward.is_running ? (TOP_BORDER[vulnerabilityBand] ?? "1px solid var(--line-soft)") : "2px solid var(--vuln-open-fg)";

  return (
    <Link href={`/wards/${ward.ward}`} style={{ display: "block", textDecoration: "none" }}>
      <div
        className="np-cell"
        style={{ borderTop }}
      >
        <div
          className="font-mono"
          style={{
            fontSize: "0.55rem",
            color: "var(--text-soft)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: "0.2rem",
          }}
        >
          Ward {wardNum}
        </div>
        <div
          className="font-heading"
          style={{
            fontSize: "0.88rem",
            fontWeight: 700,
            color: "var(--text-strong)",
            lineHeight: 1.2,
            marginBottom: "0.25rem",
          }}
        >
          {wardLabel}
        </div>
        <div
          className="font-mono"
          style={{
            fontSize: "0.6rem",
            color: "var(--text-mid)",
            marginBottom: "0.45rem",
          }}
        >
          {titleName}
          {ward.is_byelection_incumbent && (
            <span style={{ color: "var(--text-soft)" }}> · By-elec.</span>
          )}
        </div>
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {ward.is_running ? (
            <VulnerabilityPill band={vulnerabilityBand} />
          ) : (
            <span className="np-tag" style={{ color: "var(--vuln-open-fg)", borderColor: "var(--vuln-open-fg)" }}>Open seat</span>
          )}
        </div>
      </div>
    </Link>
  );
}
