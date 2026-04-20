import Link from "next/link";
import { getWards, getPollingAverages } from "@/lib/api";
import { VoterAlignmentDots } from "@/components/voter-alignment-dots";

export default async function Home() {
  const [wardsData, pollsData] = await Promise.all([
    getWards(),
    getPollingAverages(),
  ]);

  const competitiveCount = wardsData.wards.filter(
    (w) => w.race_class === "competitive"
  ).length;
  const openCount = wardsData.wards.filter(
    (w) => w.race_class === "open"
  ).length;

  return (
    <main className="np-shell">
      {/* Zone 1: Hero — dots + sidebar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 200px",
          border: "1px solid #ccc",
          borderTop: "2px solid #1a1a1a",
          marginBottom: "0",
        }}
      >
        {/* Main column: voter alignment dots */}
        <div style={{ borderRight: "1px solid #ccc" }}>
          <VoterAlignmentDots model={pollsData.pool_model} />
        </div>

        {/* Sidebar: stats */}
        <div style={{ padding: "1.5rem 1rem" }}>
          <div
            style={{
              fontFamily: "var(--font-ibm-mono), monospace",
              fontSize: "0.58rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#888",
              marginBottom: "0.75rem",
            }}
          >
            At a glance
          </div>

          {[
            { label: "Total wards", value: 25 },
            { label: "Competitive", value: competitiveCount },
            { label: "Open seats", value: openCount },
            { label: "Polls tracked", value: pollsData.total_polls_available },
          ].map((stat, i, arr) => (
            <div
              key={stat.label}
              style={{
                paddingBottom: "0.65rem",
                marginBottom: "0.65rem",
                borderBottom: i < arr.length - 1 ? "1px solid #e0ddd8" : "none",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-ibm-mono), monospace",
                  fontSize: "0.55rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#aaa",
                  marginBottom: "0.2rem",
                }}
              >
                {stat.label}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-newsreader), serif",
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  color: "#1a1a1a",
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </div>
            </div>
          ))}

          <p
            style={{
              fontFamily: "var(--font-newsreader), serif",
              fontSize: "0.7rem",
              color: "#999",
              fontStyle: "italic",
              lineHeight: 1.5,
              marginTop: "0.75rem",
            }}
          >
            Tracking the Toronto 2026 mayoral race and ward-level council
            dynamics. Nominations open May 1.
          </p>
        </div>
      </div>

      {/* Zone 2: Section teasers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          borderLeft: "1px solid #ccc",
          borderBottom: "1px solid #ccc",
          marginTop: "2rem",
          borderTop: "2px solid #1a1a1a",
        }}
      >
        <Link
          href="/wards"
          style={{
            display: "block",
            padding: "1rem 1.25rem",
            borderRight: "1px solid #ccc",
            textDecoration: "none",
          }}
        >
          <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
            Council
          </div>
          <div
            style={{
              fontFamily: "var(--font-newsreader), serif",
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "#1a1a1a",
              marginBottom: "0.5rem",
            }}
          >
            Ward-by-ward race projections
          </div>
          <div
            style={{
              fontFamily: "var(--font-ibm-mono), monospace",
              fontSize: "0.65rem",
              color: "#aaa",
            }}
          >
            →
          </div>
        </Link>

        <Link
          href="/polls"
          style={{
            display: "block",
            padding: "1rem 1.25rem",
            borderRight: "1px solid #ccc",
            textDecoration: "none",
          }}
        >
          <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
            Polling
          </div>
          <div
            style={{
              fontFamily: "var(--font-newsreader), serif",
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "#1a1a1a",
              marginBottom: "0.5rem",
            }}
          >
            Mayoral poll tracker
          </div>
          <div
            style={{
              fontFamily: "var(--font-ibm-mono), monospace",
              fontSize: "0.65rem",
              color: "#aaa",
            }}
          >
            →
          </div>
        </Link>

        <div
          style={{
            padding: "1rem 1.25rem",
            borderRight: "1px solid #ccc",
          }}
        >
          <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
            Model
          </div>
          <div
            style={{
              fontFamily: "var(--font-newsreader), serif",
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "#1a1a1a",
              marginBottom: "0.5rem",
            }}
          >
            Pre-nomination phase
          </div>
          <div
            style={{
              fontFamily: "var(--font-ibm-mono), monospace",
              fontSize: "0.65rem",
              color: "#999",
              fontStyle: "italic",
            }}
          >
            Structural factors only — field not yet set
          </div>
        </div>
      </div>
    </main>
  );
}
