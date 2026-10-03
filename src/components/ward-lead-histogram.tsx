import type { WardLeadScenarios } from "@/types/feeds";

export function WardLeadHistogram({
  name,
  scenarios,
}: {
  name: string;
  scenarios: WardLeadScenarios;
}) {
  const maximum = Math.max(
    5,
    Math.ceil(
      (Math.max(...scenarios.bins.map((bin) => bin.fraction)) * 100) / 5,
    ) * 5,
  );
  return (
    <figure className="ward-scenarios">
      <div className="ward-scenarios__directions">
        <span>Another named candidate ahead</span>
        <span>{name} ahead</span>
      </div>
      <p className="ward-scenarios__ylabel">Share of simulated scenarios</p>
      <div
        className="ward-scenarios__plot"
        role="img"
        aria-label={`Simulated lead for ${name} over the strongest other named candidate; negative values mean another candidate ahead`}
      >
        {[0, maximum / 2, maximum].map((value) => (
          <div
            key={value}
            className="ward-scenarios__grid"
            style={{ bottom: `${(value / maximum) * 100}%` }}
          >
            <span className="ward-scenarios__ytick">{value}%</span>
          </div>
        ))}
        {scenarios.bins.map((bin, index) => (
          <span
            key={bin.left}
            className="ward-scenarios__bar"
            style={{
              left: `${index * 2.5}%`,
              width: "calc(2.5% - 1px)",
              height: `${((bin.fraction * 100) / maximum) * 100}%`,
            }}
            title={`${bin.left.toFixed(0)} to ${bin.right.toFixed(0)} points: ${(bin.fraction * 100).toFixed(1)}% of scenarios`}
          />
        ))}
        <span className="ward-scenarios__zero">
          <span>Tie</span>
        </span>
      </div>
      <div className="ward-scenarios__xaxis" aria-hidden="true">
        {[-100, -50, 0, 50, 100].map((value) => (
          <span key={value} style={{ left: `${(value + 100) / 2}%` }}>
            {value > 0 ? `+${value}` : value}
          </span>
        ))}
      </div>
      <p className="ward-scenarios__xlabel">
        Leader’s advantage over the strongest named rival (percentage points)
      </p>
      <figcaption className="forecast-caption">
        Illustrative scenarios among poll-named candidates, combining two error
        models equally. Unreported candidates are outside the model.
      </figcaption>
      <table className="sr-only">
        <caption>
          Scenario distribution for {name}’s lead, among named candidates
        </caption>
        <thead>
          <tr>
            <th>Lead in percentage points</th>
            <th>Share of scenarios</th>
          </tr>
        </thead>
        <tbody>
          {scenarios.bins.map((bin) => (
            <tr key={bin.left}>
              <td>
                {bin.left.toFixed(0)} to {bin.right.toFixed(0)}
              </td>
              <td>{(bin.fraction * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
