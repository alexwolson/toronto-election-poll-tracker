import Link from "next/link";
import { Ward } from "@/types/ward";
import { getVulnerabilityBand } from "@/lib/vulnerability";
import { VulnerabilityPill } from "@/components/vulnerability-pill";
import { getWardDisplayName } from "@/lib/ward-names";

interface WardCardProps {
  ward: Ward;
}

const TOP_BORDER: Record<string, string> = {
  competitive: "2px solid #c53030",
  open: "2px solid #d97706",
  safe: "1px solid #ccc",
};

const TAG_STYLE: Record<string, { color: string }> = {
  competitive: { color: "#9b1c1c" },
  open: { color: "#92400e" },
};

export function WardCard({ ward }: WardCardProps) {
  const raceLabel =
    ward.race_class === "open"
      ? "Open seat"
      : ward.race_class === "competitive"
      ? "Competitive"
      : "";
  const vulnerabilityBand = getVulnerabilityBand(ward.defeatability_score);
  const titleName = ward.is_running ? ward.councillor_name : "Open seat";
  const wardLabel = getWardDisplayName(ward.ward);
  const wardNum = String(ward.ward).padStart(2, "0");

  return (
    <Link href={`/wards/${ward.ward}`} style={{ display: "block", textDecoration: "none" }}>
      <div
        className="np-cell"
        style={{ borderTop: TOP_BORDER[ward.race_class] ?? "1px solid #ccc" }}
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
          {ward.race_class !== "safe" && (
            <span
              className="np-tag"
              style={TAG_STYLE[ward.race_class]}
            >
              {raceLabel}
            </span>
          )}
          <VulnerabilityPill band={vulnerabilityBand} />
        </div>
      </div>
    </Link>
  );
}
