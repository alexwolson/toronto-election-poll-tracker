import { getWard } from "@/lib/api";
import { Challenger } from "@/types/ward";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getVulnerabilityBand,
  getVulnerabilitySignals,
} from "@/lib/vulnerability";
import { VulnerabilityPill } from "@/components/vulnerability-pill";
import { getWardDisplayName } from "@/lib/ward-names";

interface Props {
  params: Promise<{ ward_num: string }>;
}

// All three factors: negative value = increases risk, non-negative = reduces risk.
// (vuln < 0, coat < 0, chal < 0 are all red in the existing colour logic.)
function factorDirection(value: number): { label: string; color: string } {
  return value < 0
    ? { label: "↑ increases risk", color: "#c53030" }
    : { label: "↓ reduces risk", color: "#15803d" };
}

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-ibm-mono), monospace",
};

const SERIF: React.CSSProperties = {
  fontFamily: "var(--font-newsreader), serif",
};

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
      <main className="np-shell" style={{ maxWidth: "48rem" }}>
        <Link
          href="/wards"
          style={{ ...MONO, fontSize: "0.65rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", textDecoration: "none", display: "inline-block", marginBottom: "1.5rem" }}
        >
          ← All Wards
        </Link>
        <h1 style={{ ...SERIF, fontSize: "2rem", fontWeight: 700, color: "#1a1a1a", marginBottom: "1rem" }}>
          Ward {wardNum}
        </h1>
        <div style={{ border: "1px solid #ccc", padding: "1rem" }}>
          <p style={{ fontWeight: 600 }}>Ward data is temporarily unavailable.</p>
          <p style={{ ...MONO, fontSize: "0.65rem", color: "#555", marginTop: "0.5rem" }}>
            The backend API might be down. Please try again shortly.
          </p>
        </div>
      </main>
    );
  }

  const { ward, challengers } = data;
  const vulnerabilityBand = getVulnerabilityBand(ward.defeatability_score);
  const vulnerabilitySignals = getVulnerabilitySignals(ward);
  const displayName = ward.is_running ? ward.councillor_name : "Open seat";
  const wardLabel = getWardDisplayName(ward.ward);

  const signalArrow = (direction: "up" | "down" | "flat") =>
    direction === "up" ? "↑" : direction === "down" ? "↓" : "→";
  const signalColor = (direction: "up" | "down" | "flat") =>
    direction === "up"
      ? "#c53030"
      : direction === "down"
      ? "#15803d"
      : "#92400e";

  return (
    <main className="np-shell" style={{ maxWidth: "52rem" }}>
      {/* Breadcrumb */}
      <Link
        href="/wards"
        style={{
          ...MONO,
          fontSize: "0.62rem",
          color: "#555",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          textDecoration: "none",
          display: "inline-block",
          marginBottom: "1.5rem",
          padding: "0.2rem 0.4rem",
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLElement).style.background = "#f0ede8";
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.background = "transparent";
        }}
      >
        ← All Wards
      </Link>

      {/* Header */}
      <div className="np-kicker" style={{ marginBottom: "0.3rem" }}>
        Ward profile
      </div>
      <h1
        style={{
          ...SERIF,
          fontSize: "clamp(1.6rem, 4vw, 2.5rem)",
          fontWeight: 700,
          color: "#1a1a1a",
          margin: "0 0 0.25rem 0",
          letterSpacing: "-0.01em",
        }}
      >
        {wardLabel}
      </h1>
      <p
        style={{
          ...MONO,
          fontSize: "0.72rem",
          color: "#555",
          marginBottom: "0.75rem",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {displayName}
        {ward.is_running && ward.is_byelection_incumbent && (
          <span style={{ color: "#666" }}> · By-election incumbent</span>
        )}
      </p>
      <hr className="np-rule" />

      {/* Race class + vulnerability */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          border: "1px solid #ccc",
          borderTop: "none",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            padding: "0.75rem 1rem",
            borderRight: "1px solid #ccc",
          }}
        >
          <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
            Race class
          </div>
          <span
            style={{
              ...MONO,
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#1a1a1a",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {ward.race_class}
          </span>
        </div>
        <div style={{ padding: "0.75rem 1rem" }}>
          <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
            Vulnerability
          </div>
          <VulnerabilityPill band={vulnerabilityBand} />
        </div>
      </div>

      {/* Vulnerability signals */}
      {ward.ward !== 19 && (
        <section style={{ marginBottom: "2rem" }}>
          <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
            Vulnerability signals
          </div>
          <hr className="np-rule" />
          <table className="np-table">
            <tbody>
              {vulnerabilitySignals.map((signal) => (
                <tr key={signal.id}>
                  <td>
                    <span
                      style={{
                        ...SERIF,
                        fontSize: "0.88rem",
                        fontWeight: 600,
                        color: "#1a1a1a",
                        display: "block",
                      }}
                    >
                      {signal.label}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "#555",
                        display: "block",
                        marginTop: "0.1rem",
                      }}
                    >
                      {signal.summary}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <span style={{ ...MONO, fontSize: "0.72rem", color: "#333", marginRight: "0.5rem" }}>
                      {signal.valueLabel}
                    </span>
                    <span
                      style={{
                        ...MONO,
                        fontSize: "0.85rem",
                        color: signalColor(signal.direction),
                      }}
                    >
                      {signalArrow(signal.direction)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Model factors */}
      {ward.is_running && (
        <section style={{ marginBottom: "2rem" }}>
          <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
            Model factors
          </div>
          <hr className="np-rule" />
          <table className="np-table">
            <tbody>
              {[
                { label: "Vulnerability effect", dir: factorDirection(ward.factors.vuln) },
                { label: "Coattail effect", dir: factorDirection(ward.factors.coat) },
                { label: "Challenger effect", dir: factorDirection(ward.factors.chal) },
              ].map(({ label, dir }) => (
                <tr key={label}>
                  <td>
                    <span style={{ ...SERIF, fontSize: "0.88rem", fontWeight: 600, color: "#1a1a1a" }}>
                      {label}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <span style={{ ...MONO, fontSize: "0.72rem", color: dir.color }}>
                      {dir.label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Challengers */}
      <section>
        <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
          Challengers{" "}
          <span style={{ color: "#777" }}>({challengers.length})</span>
        </div>
        <hr className="np-rule" />
        {challengers.length === 0 ? (
          <p style={{ ...MONO, fontSize: "0.65rem", color: "#666", padding: "0.75rem 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            No challenger data entered yet.
          </p>
        ) : (
          <table className="np-table">
            <tbody>
              {challengers.map((c: Challenger) => (
                <tr key={c.candidate_name}>
                  <td>
                    <span style={{ ...SERIF, fontSize: "0.88rem", fontWeight: 600, color: "#1a1a1a", display: "block" }}>
                      {c.candidate_name}
                      {c.is_endorsed_by_departing && (
                        <span style={{ color: "#15803d", marginLeft: "0.4rem" }}>★</span>
                      )}
                    </span>
                    <span style={{ ...MONO, fontSize: "0.6rem", color: "#555" }}>
                      Aligned: {c.mayoral_alignment}
                      {c.fundraising_tier && ` · Fundraising: ${c.fundraising_tier}`}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", verticalAlign: "top" }}>
                    <span className="np-tag" style={{ color: "#555" }}>
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
