import { getWards, getPollingAverages } from "@/lib/api";
import { VoterAlignmentBars } from "@/components/voter-alignment-bars";
import { ModelExplainer } from "@/components/model-explainer";

export default async function Home() {
  const [wardsData, pollsData] = await Promise.all([
    getWards(),
    getPollingAverages(),
  ]);

  const competitiveCount = wardsData.wards.filter(
    (w) => w.race_class === "competitive" && w.defeatability_score >= 55
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
          border: "1px solid var(--line-soft)",
          borderTop: "2px solid var(--line-strong)",
          marginBottom: "0",
        }}
      >
        {/* Main column: voter alignment dots */}
        <div style={{ borderRight: "1px solid var(--line-soft)" }}>
          <VoterAlignmentBars model={pollsData.pool_model} />
        </div>

        {/* Sidebar: stats */}
        <div style={{ padding: "1.5rem 1rem" }}>
          <div
            className="font-mono"
            style={{
              fontSize: "0.58rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--text-mid)",
              marginBottom: "0.75rem",
            }}
          >
            At a glance
          </div>

          {[
            { label: "Total wards", value: wardsData.wards.length },
            { label: "Competitive", value: competitiveCount },
            { label: "Open seats", value: openCount },
            { label: "Polls tracked", value: pollsData.total_polls_available },
          ].map((stat, i, arr) => (
            <div
              key={stat.label}
              style={{
                paddingBottom: "0.65rem",
                marginBottom: "0.65rem",
                borderBottom: i < arr.length - 1 ? "1px solid var(--line-inner)" : "none",
              }}
            >
              <div
                className="font-mono"
                style={{
                  fontSize: "0.55rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text-soft)",
                  marginBottom: "0.2rem",
                }}
              >
                {stat.label}
              </div>
              <div
                className="font-heading"
                style={{
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  color: "var(--text-strong)",
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </div>
            </div>
          ))}

        </div>
      </div>

      {/* Zone 1.5: Model explainer */}
      <ModelExplainer model={pollsData.pool_model} />

    </main>
  );
}
