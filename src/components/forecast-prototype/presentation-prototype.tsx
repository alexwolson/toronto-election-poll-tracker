"use client";

/** THROWAWAY: three new forecast hierarchies on /?variant=odds|margin|timeline.
 * Question: which hierarchy makes a polling lead and an upset probability understandable?
 * All numbers below come from synthetic examples. No production forecast consumed.
 */
import { useEffect, useMemo, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { chance, colors, examples, makeExample, type Example, type ExampleKey } from "./example-data";
import styles from "./prototype.module.css";

const variants = ["odds", "margin", "timeline"] as const;
type Variant = typeof variants[number];
const titles = ["A · Who wins?", "B · Margin + possible vote", "C · Now → election day"];

function IntervalChart({ data, now = false }: { data: Example; now?: boolean }) {
  return <div className={styles.intervalChart}>
    <div className={styles.scale}><span>Vote share</span><span>0%</span><span>50%</span><span>100%</span></div>
    {data.summaries.map((candidate) => {
      const low = now ? candidate.nowLow : candidate.low;
      const high = now ? candidate.nowHigh : candidate.high;
      const mid = now ? candidate.now : candidate.share;
      return <div className={styles.intervalRow} key={candidate.name}>
        <span>{candidate.name}</span>
        <div className={styles.track} aria-label={`${candidate.name}: middle estimate ${mid.toFixed(1)}%, central 80% range ${low.toFixed(1)}% to ${high.toFixed(1)}%`}>
          <span className={styles.range} style={{ left: `${low}%`, width: `${high - low}%`, background: candidate.color }} />
          <span className={styles.dot} style={{ left: `${mid}%`, background: candidate.color }} />
        </div>
        <strong>{Math.round(mid)}%</strong>
      </div>;
    })}
    <p className={styles.caption}>Dot: middle estimate. Line: central 80% of {now ? "estimated support" : "simulated election outcomes"}. The remaining 20% lie outside. These ranges can overlap; they are not chances of winning.</p>
  </div>;
}

function MarginChart({ data }: { data: Example }) {
  const visible = data.bins;
  const max = Math.max(...visible.map((b) => b.probability));
  return <div className={styles.marginChart}>
    <div className={styles.direction}><span style={{ color: colors[1] }}>← Bradford ahead</span><span style={{ color: colors[0] }}>Chow ahead →</span></div>
    <svg viewBox="0 0 660 220" role="img" aria-label={`Illustrative election-day Chow minus Bradford margin. Median ${data.medianMargin.toFixed(1)} points. Bradford ahead in ${chance(data.bradfordAhead)} of simulated outcomes.`}>
      {visible.map((bin, i) => <rect key={bin.left} x={i * 16.5 + 0.75} width={15} y={180 - bin.probability / max * 155} height={bin.probability / max * 155} fill={bin.right <= 0 ? colors[1] : colors[0]} opacity={0.86}>
        <title>{bin.left} to {bin.right} points: {(bin.probability * 100).toFixed(1)}% of outcomes</title>
      </rect>)}
      <line x1="330" x2="330" y1="5" y2="186" stroke="currentColor" strokeDasharray="3 4" />
      <line x1="0" x2="660" y1="181" y2="181" stroke="currentColor" opacity=".3" />
      {[-100, -50, 0, 50, 100].map((tick) => <text key={tick} x={(tick + 100) * 3.3} y="207" textAnchor={tick === 100 ? "end" : tick === -100 ? "start" : "middle"} fill="currentColor" fontSize="13">{tick === 0 ? "Tie" : Math.abs(tick)}</text>)}
    </svg>
    <p className={styles.caption}>Each bar contains possible election outcomes. The area to the left of a tie is where Bradford finishes ahead of Chow. The horizontal axis is the vote-share gap in percentage points. All simulated outcomes are included.</p>
  </div>;
}

function ProbabilityList({ data }: { data: Example }) {
  return <div className={styles.probabilityList}>
    {data.summaries.slice(0, 3).map((c) => <div key={c.name}>
      <span><i style={{ background: c.color }} />{c.name}</span><strong>{chance(c.win)}</strong>
    </div>)}
    <p className={styles.caption}>Chance of winning, not expected vote share. Other candidates collectively: {chance(data.summaries[3].win)}. Rounded independently.</p>
  </div>;
}

function VariantA({ data }: { data: Example }) {
  const leader = [...data.summaries.slice(0, 3)].sort((a, b) => b.win - a.win)[0];
  return <>
    <div className={styles.kicker}>The election-day forecast · October 26</div>
    <h1 className={styles.headline}>Who is most likely<br />to become mayor?</h1>
    <div className={styles.oddsLayout}>
      <div className={styles.oddsHero}><span>{leader.name}’s chance of winning</span><strong style={{ color: leader.color }}>{chance(leader.win)}</strong><p>The model allows for a different result, even when a candidate leads the polls.</p></div>
      <div><ProbabilityList data={data} /><details className={styles.details}><summary>What does that chance mean?</summary><p>It is the fraction of simulated elections each candidate wins, allowing for uncertainty in polling, campaign movement and election-day differences. A win probability is not a share of the vote.</p></details></div>
    </div>
    <section className={styles.section}><h2>What the vote could look like</h2><IntervalChart data={data} /></section>
  </>;
}
function VariantB({ data }: { data: Example }) {
  return <>
    <div className={styles.kicker}>The election-day forecast · October 26</div>
    <h1 className={styles.headline}>A lead is a range<br />of possible results.</h1>
    <p className={styles.lead}>The middle outcome puts Chow {Math.abs(data.medianMargin).toFixed(0)} points {data.medianMargin >= 0 ? "ahead of" : "behind"} Bradford. The whole distribution tells us how often that order could reverse.</p>
    <div className={styles.marginLayout}><MarginChart data={data} /><aside><span className={styles.kicker}>Bradford finishes ahead of Chow</span><strong className={styles.largeChance} style={{ color: colors[1] }}>{chance(data.bradfordAhead)}</strong><p>of simulated outcomes</p><p className={styles.caption}>This compares two candidates. Winning also requires finishing ahead of everyone else.</p></aside></div>
    <section className={styles.section}><h2>What the vote could look like</h2><IntervalChart data={data} /></section>
    <section className={styles.section}><div className={styles.sectionIntro}><h2>Who wins the full race?</h2><p>All candidates compete in the same simulated elections.</p></div><ProbabilityList data={data} /></section>
  </>;
}
function VariantC({ data }: { data: Example }) {
  return <>
    <div className={styles.kicker}>From the polling signal to the result</div>
    <h1 className={styles.headline}>Today’s support.<br />Election day’s possibilities.</h1>
    <div className={styles.timeline}>
      <section><div className={styles.step}>01 <span>Now</span></div><h2>Where support stands</h2><p>The common signal estimated from the polls, accounting for differences between surveys.</p><IntervalChart data={data} now /></section>
      <section><div className={styles.step}>02 <span>October 26</span></div><h2>Where the vote could land</h2><p>Allows for campaign movement and differences between polling and the final result.</p><IntervalChart data={data} /></section>
    </div>
    <section className={styles.timelineResult}><h2>And the chance of winning?</h2><ProbabilityList data={data} /></section>
  </>;
}

export function PresentationPrototype() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const rawVariant = params.get("variant");
  const variant: Variant = variants.find((v) => v === rawVariant) ?? "margin";
  const rawExample = params.get("example");
  const example: ExampleKey = Object.keys(examples).find((k) => k === rawExample) as ExampleKey ?? "lead";
  const data = useMemo(() => makeExample(example), [example]);
  const index = variants.indexOf(variant);
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
        (target instanceof HTMLElement && (target.closest("input, textarea, select, [contenteditable=true]") || target.isContentEditable))) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const next = new URLSearchParams(params.toString());
      next.set("variant", variants[(index + (event.key === "ArrowRight" ? 1 : 2)) % 3]);
      router.replace(`${pathname}?${next}`, { scroll: false });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, params, pathname, router]);
  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    router.replace(`${pathname}?${next}`, { scroll: false });
  }
  return <main id="main-content" className={`np-shell ${styles.prototype}`}>
    <div className={styles.prototypeNotice}><strong>Design prototype · invented example data</strong><span>This is not a Toronto forecast. Compare the presentation, not these numbers.</span></div>
    <div className={styles.exampleToolbar}><label htmlFor="example">Try a different situation</label><select id="example" value={example} onChange={(event) => setParam("example", event.target.value)}>{Object.entries(examples).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select><span>{data.count.toLocaleString()} synthetic outcomes</span></div>
    {example === "stale" && <div className={styles.updateNotice}><strong>The latest update did not complete.</strong> These are the last successful example results. A real page would retain their original forecast date and identify any newer poll not yet included.</div>}
    {variant === "odds" ? <VariantA data={data} /> : variant === "margin" ? <VariantB data={data} /> : <VariantC data={data} />}
    <details className={styles.method}><summary>What belongs underneath the forecast?</summary><p>The polls used, their dates, what changed, and an explanation of important assumptions. More detailed sensitivity analysis can live here without competing with the main answer.</p><p>Research fit diagnostics stay in internal records. This prototype does not select public qualification thresholds or a final uncertainty interval.</p></details>
    <p className={styles.designState} aria-live="polite">Viewing {titles[index]} · {examples[example].label} · all numbers are synthetic. These alternatives share the same joint examples.</p>
    {process.env.NODE_ENV !== "production" && <div className={styles.switcher} role="group" aria-label="Prototype presentation variants"><button onClick={() => setParam("variant", variants[(index + 2) % 3])} aria-label="Previous presentation">←</button><div><small>Presentation prototype</small><strong>{titles[index]}</strong></div><button onClick={() => setParam("variant", variants[(index + 1) % 3])} aria-label="Next presentation">→</button></div>}
  </main>;
}

export function PrototypeHost({ children }: { children: ReactNode }) {
  const params = useSearchParams();
  return params.has("variant") ? <PresentationPrototype /> : children;
}
