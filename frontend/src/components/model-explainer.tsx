'use client';

import { useState, type ReactNode } from 'react';
import type { PoolModel } from '@/lib/api';

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
        Those who approve form Chow&apos;s reachable universe. Those who
        disapprove are the anti-Chow pool — the bloc any challenger needs to
        consolidate to win. &ldquo;Not sure&rdquo; voters are genuinely
        persuadable; how they break depends on the campaign.
      </p>
      <p>
        We weight approval data with a 30-day half-life, because approval moves
        slowly and older readings are still informative.
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
        Recent polls dominate here. A <em>12-day half-life</em> means a poll
        from three weeks ago carries roughly a quarter of the weight of
        today&apos;s. This gives us Chow&apos;s current position within the
        floor-to-ceiling range set in steps 1 and 2.
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
        Bradford&apos;s capture rate is his share in multi-candidate polls
        divided by the total anti-Chow pool. We also track whether it&apos;s
        rising, stalling, or reversing: comparing his mean rate in the past 90
        days against older polls. A rising rate means he&apos;s consolidating
        the opposition; stalling means the field may be waiting for someone else.
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
            sublabel="Weighted approve rate → Chow's reachable universe"
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
              <th className="me-num">Recency weight</th>
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
              <td colSpan={2}>Recency-weighted average</td>
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
  const bradfordShare = candidates['bradford']?.share ?? 0;
  const captureRate = pool.anti_chow_pool > 0 ? bradfordShare / pool.anti_chow_pool : 0;
  const trendLabel =
    consolidation_trend === 'consolidating'
      ? 'Rising — consolidating the opposition'
      : consolidation_trend === 'reversing'
        ? 'Reversing — losing opposition support'
        : consolidation_trend === 'stalling'
          ? 'Stalling — opposition not consolidating'
          : 'Insufficient data to determine trend';

  return (
    <div className="me-drawer">
      <div className="me-drawer-title">
        Step 4 · Multi-candidate polls used for capture rate
      </div>
      <div className="me-drawer-cols">
        <table className="me-data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Firm</th>
              <th>Field tested</th>
              <th className="me-num">Bradford</th>
              <th className="me-num">Recency weight</th>
            </tr>
          </thead>
          <tbody>
            {poll_detail.capture_polls.map((row, i) => (
              <tr key={i} className={i === 0 ? 'me-row--highlight' : ''}>
                <td>{row.date}</td>
                <td>{row.firm}</td>
                <td>{row.field_tested}</td>
                <td className="me-num">{pct(row.bradford)}</td>
                <td className="me-num">{wt(row.recency_weight)}</td>
              </tr>
            ))}
            <tr className="me-row--total">
              <td colSpan={3}>Recency-weighted Bradford share</td>
              <td className="me-num">{pct(bradfordShare)}</td>
              <td className="me-num me-dim">—</td>
            </tr>
          </tbody>
        </table>
        <div>
          <div className="me-computed-kicker">Computed values</div>
          <ComputedValue
            label="Bradford share"
            value={pct(bradfordShare)}
            color="#00a2bf"
            sublabel="Recency-weighted avg across multi-candidate polls"
          />
          <ComputedValue
            label="Capture rate"
            value={pct(captureRate)}
            color="#00a2bf"
            sublabel={`${pct(bradfordShare)} ÷ ${pct(pool.anti_chow_pool)} anti-Chow pool → ${pct(uncaptured_anti_chow)} of pool still uncaptured`}
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
  const bradfordShare = candidates['bradford']?.share ?? 0;
  const antiChowPool = pool.anti_chow_pool;
  const captureRate = antiChowPool > 0 ? bradfordShare / antiChowPool : 0;
  const currentChow = pool.chow_h2h_current ?? pool.chow_floor;

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
      source: `Approval polls · ${data_notes.approval_data_points} data points · 30-day half-life`,
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
      source: `Bradford vs Chow H2H polls · 12-day half-life`,
      title: 'Where does Chow sit in the likely match-up?',
      pills: [
        { label: `Current position ${pct(currentChow)}`, className: 'me-pill me-pill--purple' },
      ],
      pollCount: poll_detail.h2h_polls.length,
    },
    {
      num: 4,
      source: `Multi-candidate polls · 2+ challengers tested`,
      title: 'How much of the anti-Chow vote has Bradford captured?',
      pills: [
        { label: `Bradford capture ${pct(captureRate)}`, className: 'me-pill me-pill--blue' },
        {
          label:
            consolidation_trend === 'insufficient_data'
              ? 'Insufficient data'
              : `Trend: ${consolidation_trend}`,
          className: 'me-pill me-pill--dark',
        },
      ],
      pollCount: poll_detail.capture_polls.length,
    },
  ];

  return (
    <div className="me-shell">
      <div className="me-intro">
        <div className="me-kicker">How the model works</div>
        <div className="me-dek">
          The visualization above isn&apos;t a poll average — it&apos;s a
          structural picture of where the electorate sits right now. Here&apos;s
          how we build it from the raw polling data.
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
