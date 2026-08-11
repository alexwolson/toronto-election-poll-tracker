import Link from "next/link";
import { Ward } from "@/types/ward";
import { getWardDisplayName } from "@/lib/ward-names";

interface WardCardProps {
  ward: Ward;
}

const STATUS_LABEL: Record<Ward["race_class"], string> = {
  safe: "Safe",
  competitive: "Competitive",
  open: "Open",
};

export function WardCard({ ward }: WardCardProps) {
  const titleName = ward.is_running ? ward.councillor_name : "Open seat";
  const wardLabel = getWardDisplayName(ward.ward);
  const wardNum = String(ward.ward).padStart(2, "0");

  return (
    <Link href={`/wards/${ward.ward}`} className="ward-card-link" aria-label={`${wardLabel}: ${STATUS_LABEL[ward.race_class]} race. ${titleName}.`}>
      <div
        className={`np-cell ward-card ward-card--${ward.race_class}`}
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
        <div className="ward-card-signals">
          <span className={`race-status race-status--${ward.race_class}`}>{STATUS_LABEL[ward.race_class]}</span>
          {ward.is_running ? (
            <span>Vulnerability {Math.round(ward.defeatability_score)}</span>
          ) : <span>No running incumbent</span>}
        </div>
      </div>
    </Link>
  );
}
