import Link from "next/link";

const STEPS = [
  {
    title: "Report what polls observed",
    body: "Current-field, head-to-head, challenger split, approval, and historical context are shown as separate evidence.",
  },
  {
    title: "Respect each poll’s ballot",
    body: "A poll informs only the candidates it actually offered plus residual responses. Omitted candidates are never entered at zero.",
  },
  {
    title: "Project election day",
    body: "A calibrated probabilistic model estimates candidate share ranges and win probabilities, separately from observed polling and approval.",
  },
  {
    title: "Model ward races separately",
    body: "Council uses the same mayoral mood draws when available, while race status remains an independent structural verdict.",
  },
];

export function ModelSummary() {
  return (
    <section className="model-summary" aria-labelledby="model-summary-title">
      <div className="np-section-header">
        <div>
          <p className="np-kicker">How to read this</p>
          <h2 id="model-summary-title" className="section-title">
            Four steps, from evidence to estimate
          </h2>
        </div>
      </div>
      <ol className="model-summary-grid">
        {STEPS.map((step, index) => (
          <li key={step.title}>
            <span className="model-summary-number">{index + 1}</span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <Link href="/sources#methodology" className="text-link">
        Read the complete methodology on About &amp; Sources
      </Link>
    </section>
  );
}
