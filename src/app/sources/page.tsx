const SERIF: React.CSSProperties = {
  fontFamily: "var(--font-newsreader), serif",
};

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-ibm-mono), monospace",
};

function SourceRow({
  name,
  url,
  description,
}: {
  name: string;
  url: string;
  description: string;
}) {
  return (
    <div
      style={{
        padding: "1rem 0",
        borderBottom: "1px solid #e8e5e0",
      }}
    >
      <div
        style={{
          ...SERIF,
          fontWeight: 700,
          fontSize: "1rem",
          marginBottom: "0.25rem",
        }}
      >
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...SERIF, color: "#1a1a1a" }}
        >
          {name}
        </a>
      </div>
      <div style={{ fontSize: "0.875rem", color: "#444", lineHeight: 1.5 }}>
        {description}
      </div>
    </div>
  );
}

const POLLING_FIRMS: { name: string; url: string }[] = [
  { name: "Mainstreet Research", url: "https://mainstreetresearch.ca" },
  { name: "Léger", url: "https://leger360.com" },
  { name: "Forum Research", url: "https://forumresearch.com" },
];

export default function SourcesPage() {
  return (
    <main className="np-shell">
      {/* Page header */}
      <div className="np-kicker" style={{ marginBottom: "0.3rem" }}>
        Data &amp; Attribution
      </div>
      <h1
        style={{
          ...SERIF,
          fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
          fontWeight: 700,
          margin: "0 0 0.5rem 0",
          letterSpacing: "-0.01em",
          color: "#1a1a1a",
        }}
      >
        Sources
      </h1>
      <hr className="np-rule" style={{ marginBottom: "2rem" }} />

      {/* Section 1: Council projections */}
      <div style={{ marginBottom: "2.5rem" }}>
        <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
          Council projections
        </div>
        <hr className="np-rule" style={{ marginBottom: "1rem" }} />

        {/* Matt Elliott callout */}
        <div
          style={{
            background: "#f5f5f0",
            border: "1px solid #ccc",
            padding: "1rem 1.25rem",
          }}
        >
          <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
            Primary contributor
          </div>
          <div
            style={{
              ...SERIF,
              fontWeight: 700,
              fontSize: "1.1rem",
              marginBottom: "0.6rem",
            }}
          >
            <a
              href="https://cityhallwatcher.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#1a1a1a" }}
            >
              Matt Elliott · City Hall Watcher
            </a>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            {[
              {
                label: "Council Defeatability Index",
                desc: "Vulnerability scores and methodology for all 25 wards",
              },
              {
                label: "Council voting alignment scores",
                desc: "Councillor alignment scores under the Chow and Tory mayoralties",
              },
            ].map(({ label, desc }) => (
              <div
                key={label}
                style={{ ...MONO, fontSize: "0.72rem", color: "#444" }}
              >
                <span style={{ fontWeight: 600 }}>{label}</span> — {desc}
              </div>
            ))}
          </div>
        </div>

        {/* Toronto Open Data */}
        <SourceRow
          name="Toronto Open Data"
          url="https://open.toronto.ca"
          description="Ward election results (2018, 2022 municipal elections; 2023 mayoral by-election); candidate registrations and financial filings for 2026"
        />
      </div>

      {/* Section 2: Mayoral polling */}
      <div style={{ marginBottom: "2.5rem" }}>
        <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
          Mayoral polling
        </div>
        <hr className="np-rule" style={{ marginBottom: "1rem" }} />
        <div
          style={{
            ...MONO,
            fontSize: "0.72rem",
            color: "#555",
            marginBottom: "1rem",
          }}
        >
          Polls compiled manually from published firm releases.
        </div>
        <div style={{ border: "1px solid #ccc" }}>
          {POLLING_FIRMS.map((firm, i) => (
            <div
              key={firm.name}
              style={{
                padding: "0.75rem 1rem",
                borderBottom:
                  i < POLLING_FIRMS.length - 1 ? "1px solid #e8e5e0" : "none",
              }}
            >
              <a
                href={firm.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  ...SERIF,
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  color: "#1a1a1a",
                }}
              >
                {firm.name}
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Background data */}
      <div>
        <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
          Background data
        </div>
        <hr className="np-rule" />
        <SourceRow
          name="Statistics Canada"
          url="https://statcan.gc.ca"
          description="Ward population estimates and growth since 2022"
        />
        <SourceRow
          name="338Canada"
          url="https://338canada.com"
          description="Methodological inspiration for polling aggregation; model by Philippe J. Fournier"
        />
      </div>
    </main>
  );
}
