'use client';

import { useState, type ReactNode } from 'react';
import type { PoolModel } from '@/lib/api';
import { getCandidateColor, getCandidateName, getLeadingCandidate, pollTestedCandidate } from '@/lib/pool-candidates';

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

function wt(v: number): string {
  return v.toFixed(3);
}

function ComputedValue({
  label,
  value,
  color,
  sublabel,
}: {
  label: string;
  value: string;
  color?: string;
  sublabel: string;
}) {
  return (
    <div className="me-computed-item">
      <div className="me-computed-label">{label}</div>
      <div className="me-computed-val" style={color ? { color } : undefined}>
        {value}
      </div>
      <div className="me-computed-sublabel">{sublabel}</div>
    </div>
  );
}

const STEP_BODY: Record<1 | 2 | 3 | 4, ReactNode> = {
  1: (
    <>
      <p>
        Before looking at vote intentions, we ask something simpler: does Toronto{' '}
        <em>approve</em> or <em>disapprove</em> of Chow as mayor? Approval
        measures a voter&apos;s underlying orientation — independent of who else
        is running.
      </p>
      <p>
        Those who disapprove are the anti-Chow pool — the bloc any challenger
        needs to consolidate to win. Everyone else — approvers plus the
        genuinely unsure — forms Chow&apos;s reachable universe, her ceiling.
        Approval alone is not a ceiling on vote share: voters do back
        candidates they disapprove of, so we define the ceiling as everyone
        not actively hostile to her.
      </p>
      <p>
        We weight approval readings by recency with a 30-day half-life: a
        month-old reading counts half as much as today&apos;s, a reading from
        last winter barely registers. A fresh data point always outweighs a
        backlog of stale ones.
      </p>
    </>
  ),
  2: (
    <>
      <p>
        Not all of Chow&apos;s ceiling is equally solid. To find the floor, we
        look at polls that test four or more named candidates simultaneously. In
        a crowded field, vote share is fragmented — so Chow&apos;s number in
        those polls is close to the minimum she&apos;ll hold under any realistic
        scenario.
      </p>
      <p>
        We weight by candidate count: a six-way field gives a better floor
        estimate than a four-way one. Crucially, we do <em>not</em>{' '}
        recency-weight this step — the floor is a structural property of
        Chow&apos;s coalition, not a trend. A poll from six months ago is just
        as informative as last week&apos;s.
      </p>
    </>
  ),
  3: (
    <>
      <p>
        Head-to-head polls isolate the core contest. We use only Bradford vs
        Chow surveys — Tory has publicly declined to run, so those polls reflect
        a scenario that&apos;s no longer on the table. Three-way polls are also
        excluded, since they depress both candidates&apos; shares in ways that
        make comparisons misleading.
      </p>
      <p>
        Recent polls dominate here. We weight by recency with a 12-day
        half-life — the same decay the site&apos;s main polling average uses —
        so the newest Bradford vs Chow reading effectively sets the number.
        This gives us Chow&apos;s current position within the floor-to-ceiling
        range set in steps 1 and 2.
      </p>
    </>
  ),
  4: (
    <>
      <p>
        The anti-Chow pool is the key battleground. Wanting change isn&apos;t
        the same as having a candidate — right now a meaningful share of that
        pool remains uncaptured by any challenger.
      </p>
      <p>
        Each tracked challenger&apos;s capture rate is their share in
        multi-candidate polls divided by the total anti-Chow pool. The trend
        indicator tracks Bradford specifically — whether his rate is rising,
        stalling, or reversing, comparing his mean rate in the past 90 days
        against older polls. A rising rate means he&apos;s consolidating the
        opposition; stalling means the field may be waiting for someone else.
      </p>
    </>
  ),
};

function Step1Drawer({ model }: { model: PoolModel }) {
  const { approval, pool, poll_detail } = model;
  return (
    <div className="me-drawer">
      <div className="me-drawer-title">Step 1 · All approval polls used</div>
      <div className="me-drawer-cols">
        <table className="me-data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Firm</th>
              <th className="me-num">Approve</th>
              <th className="me-num">Disapprove</th>
              <th className="me-num">Not sure</th>
              <th className="me-num">Weight</th>
            </tr>
          </thead>
          <tbody>
            {poll_detail.approval_polls.map((row, i) => (
              <tr key={i} className={i === 0 ? 'me-row--highlight' : ''}>
                <td>{row.date}</td>
                <td>{row.firm}</td>
                <td className="me-num">{pct(row.approve)}</td>
                <td className="me-num">{pct(row.disapprove)}</td>
                <td className="me-num">{pct(row.not_sure)}</td>
                <td className="me-num">{wt(row.weight)}</td>
              </tr>
            ))}
            <tr className="me-row--total">
              <td colSpan={2}>Weighted average</td>
              <td className="me-num">{pct(approval.approve)}</td>
              <td className="me-num">{pct(approval.disapprove)}</td>
              <td className="me-num">{pct(approval.not_sure)}</td>
              <td className="me-num me-dim">—</td>
            </tr>
          </tbody>
        </table>
        <div>
          <div className="me-computed-kicker">Computed values</div>
          <ComputedValue
            label="Chow ceiling"
            value={pct(pool.chow_ceiling)}
            color="#854a90"
            sublabel="Everyone not in the anti-Chow pool (approve + not sure)"
          />
          <ComputedValue
            label="Anti-Chow pool"
            value={pct(pool.anti_chow_pool)}
            color="#00a2bf"
            sublabel="Weighted disapprove rate → Available to any challenger"
          />
          <ComputedValue
            label="Not yet engaged"
            value={pct(approval.not_sure)}
            color="#666"
            sublabel={'Weighted "not sure" rate → Persuadable electorate'}
          />
        </div>
      </div>
    </div>
  );
}

function Step2Drawer({ model }: { model: PoolModel }) {
  const { pool, poll_detail } = model;
  const available = Math.max(0, pool.chow_ceiling - pool.chow_floor);
  return (
    <div className="me-drawer">
      <div className="me-drawer-title">
        Step 2 · Full-field qualifying polls (4+ candidates, n ≥ 500)
      </div>
      <div className="me-drawer-cols">
        <table className="me-data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Firm</th>
              <th>Field tested</th>
              <th className="me-num">Chow</th>
              <th className="me-num">n</th>
              <th className="me-num">Cand. weight</th>
            </tr>
          </thead>
          <tbody>
            {poll_detail.floor_polls.map((row, i) => (
              <tr key={i} className={i === 0 ? 'me-row--highlight' : ''}>
                <td>{row.date}</td>
                <td>{row.firm}</td>
                <td>{row.field_tested}</td>
                <td className="me-num">{pct(row.chow)}</td>
                <td className="me-num">{row.sample_size.toLocaleString()}</td>
                <td className="me-num">{row.candidate_weight}</td>
              </tr>
            ))}
            <tr className="me-row--total">
              <td colSpan={3}>Weighted floor (by candidate count)</td>
              <td className="me-num">{pct(pool.chow_floor)}</td>
              <td className="me-num me-dim">—</td>
              <td className="me-num me-dim">—</td>
            </tr>
          </tbody>
        </table>
        <div>
          <div className="me-computed-kicker">Computed values</div>
          <ComputedValue
            label="Chow floor"
            value={pct(pool.chow_floor)}
            color="#854a90"
            sublabel="Candidate-count weighted avg → Holds regardless of field size"
          />
          <ComputedValue
            label="Available above floor"
            value={pct(available)}
            color="#c8a0d0"
            sublabel={`Ceiling (${pct(pool.chow_ceiling)}) minus floor (${pct(pool.chow_floor)}) → Soft Chow support`}
          />
        </div>
      </div>
    </div>
  );
}

function Step3Drawer({ model }: { model: PoolModel }) {
  const { pool, poll_detail } = model;
  const currentChow = pool.chow_h2h_current ?? pool.chow_floor;
  return (
    <div className="me-drawer">
      <div className="me-drawer-title">
        Step 3 · Bradford vs Chow head-to-head polls
      </div>
      <div className="me-drawer-cols">
        <table className="me-data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Firm</th>
              <th className="me-num">Chow</th>
              <th className="me-num">Bradford</th>
              <th className="me-num">n</th>
              <th className="me-num">1/rank weight</th>
            </tr>
          </thead>
          <tbody>
            {poll_detail.h2h_polls.map((row, i) => (
              <tr key={i} className={i === 0 ? 'me-row--highlight' : ''}>
                <td>{row.date}</td>
                <td>{row.firm}</td>
                <td className="me-num">{pct(row.chow)}</td>
                <td className="me-num">{pct(row.bradford)}</td>
                <td className="me-num">{row.sample_size.toLocaleString()}</td>
                <td className="me-num">{wt(row.recency_weight)}</td>
              </tr>
            ))}
            <tr className="me-row--total">
              <td colSpan={2}>1/rank-weighted average</td>
              <td className="me-num">{pct(currentChow)}</td>
              <td className="me-num me-dim">—</td>
              <td className="me-num me-dim">—</td>
              <td className="me-num me-dim">—</td>
            </tr>
          </tbody>
        </table>
        <div>
          <div className="me-computed-kicker">Computed values</div>
          <ComputedValue
            label="Chow current (H2H)"
            value={pct(currentChow)}
            color="#854a90"
            sublabel={`Within floor (${pct(pool.chow_floor)}) to ceiling (${pct(pool.chow_ceiling)}) range`}
          />
          <ComputedValue
            label="PP activated"
            value={`+${Math.round(pool.protective_progressive_activated * 100)}pp`}
            sublabel={`Current (${pct(currentChow)}) minus floor (${pct(pool.chow_floor)}) → Protective progressive premium`}
          />
        </div>
      </div>
    </div>
  );
}

function Step4Drawer({ model }: { model: PoolModel }) {
  const { pool, candidates, consolidation_trend, uncaptured_anti_chow, poll_detail } = model;
  const polledCandidates = Object.entries(candidates)
    .filter(([, c]) => c.share > 0)
    .sort(([, a], [, b]) => b.capture_rate - a.capture_rate);
  const trendLabel =
    consolidation_trend === 'consolidating'
      ? 'Rising — consolidating the opposition'
      : consolidation_trend === 'reversing'
        ? 'Reversing — losing opposition support'
        : consolidation_trend === 'stalling'
          ? 'Stalling — opposition not consolidating'
          : consolidation_trend === 'consolidated'
            ? 'Consolidated — Bradford is the sole remaining challenger'
            : 'Insufficient data to determine trend';

  return (
    <div className="me-drawer">
      <div className="me-drawer-title">
        Step 4 · Multi-candidate polls used for capture rate
      </div>
      {polledCandidates.map(([slug, candidate]) => {
        const rows = (poll_detail.capture_polls[slug] ?? []).filter((row) =>
          pollTestedCandidate(row.field_tested, slug)
        );
        const color = getCandidateColor(slug);
        return (
          <div key={slug} className="me-drawer-cols" style={{ marginBottom: '1.25rem' }}>
            <div>
              <div className="me-computed-kicker" style={{ color }}>
                {getCandidateName(slug)}
              </div>
              <table className="me-data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Firm</th>
                    <th>Field tested</th>
                    <th className="me-num">Share</th>
                    <th className="me-num">1/rank weight</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className={i === 0 ? 'me-row--highlight' : ''}>
                      <td>{row.date}</td>
                      <td>{row.firm}</td>
                      <td>{row.field_tested}</td>
                      <td className="me-num">{pct(row.share)}</td>
                      <td className="me-num">{wt(row.recency_weight)}</td>
                    </tr>
                  ))}
                  <tr className="me-row--total">
                    <td colSpan={3}>1/rank-weighted share</td>
                    <td className="me-num">{pct(candidate.share)}</td>
                    <td className="me-num me-dim">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div>
              <div className="me-computed-kicker">Computed values</div>
              <ComputedValue
                label={`${getCandidateName(slug)} share`}
                value={pct(candidate.share)}
                color={color}
                sublabel="1/rank-weighted avg across multi-candidate polls"
              />
              <ComputedValue
                label="Capture rate"
                value={pct(candidate.capture_rate)}
                color={color}
                sublabel={`${pct(candidate.share)} ÷ ${pct(pool.anti_chow_pool)} anti-Chow pool`}
              />
            </div>
          </div>
        );
      })}
      <div className="me-drawer-cols">
        <div />
        <div>
          <div className="me-computed-kicker">Computed values</div>
          <ComputedValue
            label="Uncaptured anti-Chow"
            value={pct(uncaptured_anti_chow)}
            sublabel="Anti-Chow pool minus every tracked candidate's share"
          />
          <ComputedValue
            label="Consolidation trend"
            value={
              consolidation_trend === 'insufficient_data'
                ? 'No data'
                : consolidation_trend.charAt(0).toUpperCase() +
                  consolidation_trend.slice(1)
            }
            sublabel={trendLabel}
          />
        </div>
      </div>
    </div>
  );
}

export function ModelExplainer({ model }: { model: PoolModel | null }) {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4 | null>(null);

  if (!model) return null;

  const { pool, approval, candidates, consolidation_trend, data_notes, poll_detail } = model;
  const antiChowPool = pool.anti_chow_pool;
  const currentChow = pool.chow_h2h_current ?? pool.chow_floor;
  const leading = getLeadingCandidate(candidates);
  const leadingName = leading ? getCandidateName(leading[0]) : 'the leading challenger';
  const leadingCaptureRate = leading?.[1].capture_rate ?? 0;
  const capturePollCount = Object.values(poll_detail.capture_polls)[0]?.length ?? 0;

  function toggle(step: 1 | 2 | 3 | 4) {
    setActiveStep((prev) => (prev === step ? null : step));
  }

  const steps: {
    num: 1 | 2 | 3 | 4;
    source: string;
    title: string;
    pills: { label: string; className: string }[];
    pollCount: number;
  }[] = [
    {
      num: 1,
      source: `Approval polls · ${data_notes.approval_data_points} data points · 1/rank weighting`,
      title: 'Set the size of each voter pool',
      pills: [
        { label: `Chow ceiling ${pct(pool.chow_ceiling)}`, className: 'me-pill me-pill--purple' },
        { label: `Anti-Chow pool ${pct(antiChowPool)}`, className: 'me-pill me-pill--blue' },
        { label: `Not engaged ${pct(approval.not_sure)}`, className: 'me-pill me-pill--grey' },
      ],
      pollCount: poll_detail.approval_polls.length,
    },
    {
      num: 2,
      source: `Full-field polls · ${data_notes.full_field_poll_count} qualifying · n ≥ 500`,
      title: "Establish Chow's structural floor",
      pills: [
        { label: `Chow floor ${pct(pool.chow_floor)}`, className: 'me-pill me-pill--purple' },
        {
          label: `Available ${pct(Math.max(0, pool.chow_ceiling - pool.chow_floor))}`,
          className: 'me-pill me-pill--purple-soft',
        },
      ],
      pollCount: poll_detail.floor_polls.length,
    },
    {
      num: 3,
      source: `Bradford vs Chow H2H polls · 1/rank weighting`,
      title: 'Where does Chow sit in the likely match-up?',
      pills: [
        { label: `Current position ${pct(currentChow)}`, className: 'me-pill me-pill--purple' },
      ],
      pollCount: poll_detail.h2h_polls.length,
    },
    {
      num: 4,
      source: `Multi-candidate polls · 2+ challengers tested · 1/rank weighting`,
      title: `How much of the anti-Chow vote has ${leadingName} captured?`,
      pills: [
        { label: `${leadingName} capture ${pct(leadingCaptureRate)}`, className: 'me-pill me-pill--blue' },
        {
          label:
            consolidation_trend === 'insufficient_data'
              ? 'Insufficient data'
              : consolidation_trend === 'consolidated'
                ? 'Field consolidated'
                : `Trend: ${consolidation_trend}`,
          className: 'me-pill me-pill--dark',
        },
      ],
      pollCount: capturePollCount,
    },
  ];

  return (
    <div className="me-shell">
      <div className="me-intro">
        <div className="me-kicker">How the model works</div>
        <div className="me-dek">
          Most Toronto mayoral polls were conducted before key challengers declined to run. Rather than averaging noisy vote intentions, we use the raw data to extract the underlying structure of the electorate.
        </div>
      </div>

      <div className="me-steps">
        {steps.map((step) => (
          <div
            key={step.num}
            className={`me-step${activeStep === step.num ? ' me-step--active' : ''}`}
            onClick={() => toggle(step.num)}
          >
            <div className="me-step-header">
              <span className="me-step-badge">Step {step.num}</span>
              <span className="me-step-source">{step.source}</span>
            </div>
            <div className="me-step-title">{step.title}</div>
            <div className="me-step-body">{STEP_BODY[step.num]}</div>
            <div className="me-step-output">
              {step.pills.map((pill) => (
                <span key={pill.label} className={pill.className}>
                  {pill.label}
                </span>
              ))}
              <div className="me-expand-hint">
                {activeStep === step.num ? '↑' : '↓'} See {step.pollCount} polls
              </div>
            </div>
          </div>
        ))}
      </div>

      {activeStep === 1 && <Step1Drawer model={model} />}
      {activeStep === 2 && <Step2Drawer model={model} />}
      {activeStep === 3 && <Step3Drawer model={model} />}
      {activeStep === 4 && <Step4Drawer model={model} />}
    </div>
  );
}
