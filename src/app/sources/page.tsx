const SERIF: React.CSSProperties = {
  fontFamily: "var(--font-newsreader), serif",
};

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-ibm-mono), monospace",
};

const LINK: React.CSSProperties = {
  color: "#1a1a1a",
  textDecoration: "underline",
  textUnderlineOffset: "2px",
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
          style={{ ...SERIF, ...LINK }}
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
            Data source
          </div>
          <div
            style={{
              ...SERIF,
              fontWeight: 700,
              fontSize: "1.1rem",
              marginBottom: "0.2rem",
              color: "#1a1a1a",
            }}
          >
            Matt Elliott
          </div>
          <div
            style={{
              ...MONO,
              fontSize: "0.68rem",
              color: "#666",
              marginBottom: "0.65rem",
            }}
          >
            <a
              href="https://www.thestar.com/users/profile/matt-elliott/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#666", textDecoration: "underline", textUnderlineOffset: "2px" }}
            >
              Contributing Columnist, Toronto Star
            </a>
            {" · "}
            <a
              href="https://cityhallwatcher.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#666", textDecoration: "underline", textUnderlineOffset: "2px" }}
            >
              City Hall Watcher
            </a>
          </div>
          <div
            style={{
              fontSize: "0.875rem",
              color: "#444",
              lineHeight: 1.6,
              marginBottom: "0.85rem",
            }}
          >
            Elliott publishes City Hall Watcher, the essential newsletter for
            anyone following Toronto municipal politics. The council projections
            in this model draw on two of his published analytical works, used
            with permission.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ ...MONO, fontSize: "0.72rem", color: "#444" }}>
              <a
                href="https://toronto.cityhallwatcher.com/p/looking-ahead-to-the-heartbreak-that"
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...LINK, fontWeight: 600 }}
              >
                Council Defeatability Index
              </a>
              <span style={{ color: "#888", marginLeft: "0.35rem" }}>[paywalled]</span>
              {" "}— Vulnerability scores and methodology for all 25 wards, based on
              incumbent vote share, electorate share, and ward population growth
            </div>
            <div style={{ ...MONO, fontSize: "0.72rem", color: "#444" }}>
              <a
                href="https://www.councilscorecard.ca/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...LINK, fontWeight: 600 }}
              >
                Council Scorecard
              </a>
              <span style={{ color: "#888", marginLeft: "0.35rem" }}>[paywalled]</span>
              {" "}— Councillor voting alignment scores under both the Chow and Tory mayoralties
            </div>
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
                  ...LINK,
                  fontWeight: 600,
                  fontSize: "0.95rem",
                }}
              >
                {firm.name}
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Background data */}
      <div style={{ marginBottom: "2.5rem" }}>
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

      {/* Section 4: About */}
      <div>
        <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
          About
        </div>
        <hr className="np-rule" style={{ marginBottom: "1.25rem" }} />
        <p
          style={{
            fontSize: "0.9375rem",
            lineHeight: 1.65,
            color: "#333",
            margin: "0 0 0.85rem 0",
            maxWidth: "60ch",
          }}
        >
          This site was built by Alex Olson, based in Toronto. He works at the
          University of Toronto&rsquo;s Faculty of Applied Science &amp;
          Engineering, leading the Centre for Analytics &amp; AI Engineering
          (CARTE) in the Department of Mechanical &amp; Industrial Engineering,
          with a focus on AI education, curriculum design, and applied machine
          learning.
        </p>
        <p
          style={{
            fontSize: "0.9375rem",
            lineHeight: 1.65,
            color: "#333",
            margin: 0,
            maxWidth: "60ch",
          }}
        >
          Outside of work he is involved with{" "}
          <a
            href="https://civictech.ca"
            target="_blank"
            rel="noopener noreferrer"
            style={LINK}
          >
            Civic Tech Toronto
          </a>{" "}
          and has a long-standing interest in Toronto municipal politics.
        </p>
      </div>
    </main>
  );
}
