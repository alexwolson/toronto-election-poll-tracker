/** THROWAWAY: synthetic joint draws to exercise presentation, never forecast input. */
export const examples = {
  lead: { label: "Clear lead", location: [52, 38, 8, 2], spread: 0.23 },
  close: { label: "Close race", location: [46, 44, 8, 2], spread: 0.23 },
  reversal: { label: "Bradford leads", location: [42, 48, 8, 2], spread: 0.23 },
  wider: { label: "Same lead, wider uncertainty", location: [52, 38, 8, 2], spread: 0.4 },
  decisive: { label: "Very small upset probability", location: [60, 30, 8, 2], spread: 0.11 },
  stale: { label: "Update failed; last forecast retained", location: [52, 38, 8, 2], spread: 0.23 },
};
export type ExampleKey = keyof typeof examples;
export const names = ["Olivia Chow", "Brad Bradford", "Chris Alexander", "Other candidates"];
export const colors = ["#a63638", "#225d81", "#9a7014", "#72736c"];
const count = 8000;

function quantile(values: number[], p: number) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * p)];
}

export function makeExample(key: ExampleKey) {
  // Repeatable illustrative draws; this is not the research model or real poll data.
  let seed = 9142026;
  function uniform() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return (seed + 0.5) / 4294967296;
  }
  const normal = () => Math.sqrt(-2 * Math.log(uniform())) * Math.cos(2 * Math.PI * uniform());
  const spec = examples[key];
  function simulate(spread: number) {
    return Array.from({ length: count }, () => {
      const contest = normal() * spread;
      const weights = spec.location.map((v, i) => v * Math.exp(
        (i === 0 ? contest : i === 1 ? -contest : normal() * 0.25) + normal() * spread * 0.2,
      ));
      const total = weights.reduce((a, b) => a + b);
      return weights.map((v) => v / total * 100);
    });
  }
  const today = simulate(0.07);
  const election = simulate(spec.spread);
  const wins = [0, 0, 0, 0];
  for (const row of election) {
    // A synthetic residual pool divided across 50 unnamed candidates, not one candidate.
    const values = [...row.slice(0, 3), row[3] / 50];
    wins[values.indexOf(Math.max(...values))]++;
  }
  const summaries = names.map((name, i) => {
    const current = today.map((d) => d[i]);
    const projected = election.map((d) => d[i]);
    return {
      name, color: colors[i], win: wins[i] / count,
      now: quantile(current, 0.5), nowLow: quantile(current, 0.1), nowHigh: quantile(current, 0.9),
      share: quantile(projected, 0.5), low: quantile(projected, 0.1), high: quantile(projected, 0.9),
    };
  });
  const margins = election.map((row) => row[0] - row[1]);
  const bins = Array.from({ length: 40 }, (_, i) => {
    const left = -100 + i * 5;
    return { left, right: left + 5, probability: margins.filter((x) => x >= left && x < left + 5).length / count };
  });
  return { summaries, bins, medianMargin: quantile(margins, 0.5),
    marginLow: quantile(margins, 0.1), marginHigh: quantile(margins, 0.9),
    bradfordAhead: margins.filter((m) => m < 0).length / count,
    count, example: key };
}
export type Example = ReturnType<typeof makeExample>;
export function chance(value: number) {
  if (value < 0.01) return "<1%";
  if (value > 0.99) return ">99%";
  return `${Math.round(value * 100)}%`;
}
