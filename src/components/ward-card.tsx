import Link from "next/link";
import { Ward } from "@/types/ward";
import { getVulnerabilityBand } from "@/lib/vulnerability";
import { VulnerabilityPill } from "@/components/vulnerability-pill";
import { getWardDisplayName } from "@/lib/ward-names";

interface WardCardProps {
  ward: Ward;
}

const TOP_BORDER: Record<string, string> = {
  high: "2px solid #ef4444",
  medium: "2px solid #f59e0b",
  low: "1px solid #ccc",
};

export function WardCard({ ward }: WardCardProps) {
  const vulnerabilityBand = getVulnerabilityBand(ward.defeatability_score);
  const titleName = ward.is_running ? ward.councillor_name : "Open seat";
  const wardLabel = getWardDisplayName(ward.ward);
  const wardNum = String(ward.ward).padStart(2, "0");
  const borderTop = ward.is_running ? (TOP_BORDER[vulnerabilityBand] ?? "1px solid #ccc") : "2px solid #6b7280";

  return (
    <Link href={`/wards/${ward.ward}`} style={{ display: "block", textDecoration: "none" }}>
      <div
        className="np-cell"
        style={{ borderTop }}
      >
        <div
          style={{
            fontFamily: "var(--font-ibm-mono), monospace",
            fontSize: "0.55rem",
            color: "#666",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: "0.2rem",
          }}
        >
          Ward {wardNum}
        </div>
        <div
          style={{
            fontFamily: "var(--font-newsreader), serif",
            fontSize: "0.88rem",
            fontWeight: 700,
            color: "#1a1a1a",
            lineHeight: 1.2,
            marginBottom: "0.25rem",
          }}
        >
          {wardLabel}
        </div>
        <div
          style={{
            fontFamily: "var(--font-ibm-mono), monospace",
            fontSize: "0.6rem",
            color: "#555",
            marginBottom: "0.45rem",
          }}
        >
          {titleName}
          {ward.is_byelection_incumbent && (
            <span style={{ color: "#666" }}> · By-elec.</span>
          )}
        </div>
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {ward.is_running ? (
            <VulnerabilityPill band={vulnerabilityBand} />
          ) : (
            <span className="np-tag" style={{ color: "#6b7280", borderColor: "#6b7280" }}>Open seat</span>
          )}
        </div>
      </div>
    </Link>
  );
}
