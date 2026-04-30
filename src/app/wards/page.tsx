import { Suspense } from "react";
import { getWards } from "@/lib/api";
import { WardsBrowser } from "@/components/wards-browser";

export default async function WardsPage() {
  const data = await getWards();
  const wards = data.wards || [];
  const safeCount = wards.filter((w) => w.race_class === "safe").length;
  const competitiveCount = wards.filter(
    (w) => w.race_class === "competitive" && w.defeatability_score >= 55
  ).length;
  const openCount = wards.filter((w) => w.race_class === "open").length;

  return (
    <main className="np-shell">
      {/* Section header */}
      <div style={{ marginBottom: "0" }}>
        <div className="np-kicker" style={{ marginBottom: "0.3rem" }}>
          Ward monitor
        </div>
        <div className="np-section-header">
          <h1
            className="font-heading"
            style={{
              fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
              fontWeight: 700,
              margin: 0,
              letterSpacing: "-0.01em",
              color: "var(--text-strong)",
            }}
          >
            All Wards
          </h1>
          <div
            className="font-mono"
            style={{
              display: "flex",
              gap: "1.5rem",
              fontSize: "0.7rem",
              color: "var(--text-mid)",
              paddingBottom: "0.25rem",
            }}
          >
            <span>
              <span style={{ fontWeight: 700, color: "var(--text-strong)" }}>
                {safeCount}
              </span>{" "}
              safe
            </span>
            <span>
              <span style={{ fontWeight: 700, color: "var(--vuln-high-fg)" }}>
                {competitiveCount}
              </span>{" "}
              competitive
            </span>
            <span>
              <span style={{ fontWeight: 700, color: "var(--vuln-med-fg)" }}>
                {openCount}
              </span>{" "}
              open
            </span>
          </div>
        </div>
        <hr className="np-rule" style={{ marginBottom: "1.5rem" }} />
      </div>

      <Suspense>
        <WardsBrowser wards={wards} />
      </Suspense>
    </main>
  );
}
