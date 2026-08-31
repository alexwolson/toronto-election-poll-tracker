import Link from "next/link";
import type { ReactNode } from "react";
import { MethodFlow } from "@/components/method-flow";
import { PageHero } from "@/components/page-hero";
import { loadManifest } from "@/lib/feeds";
import { formatDate } from "@/lib/format";
import {
  forecastFlow,
  glossary,
  hintAuditSnapshot,
  hintEvidenceExamples,
  hintEvidenceFlow,
  methodologyNav,
} from "@/lib/methodology";

export const metadata = {
  title: "How it works — Toronto 2026",
  description:
    "How Toronto's mayoral forecast, polling trends, council attention, and candidate-history evidence are produced.",
};

function QuestionSection({
  id,
  title,
  answer,
  children,
}: {
  id: string;
  title: string;
  answer: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="how-section" aria-labelledby={`${id}-heading`}>
      <header className="how-section__heading">
        <h2 id={`${id}-heading`}>{title}</h2>
        <div className="how-section__answer">{answer}</div>
      </header>
      {children}
    </section>
  );
}

function MethodDisclosure({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <details id={id} className="how-disclosure">
      <summary>
        <span>{title}</span>
        <small>{description}</small>
      </summary>
      <div className="how-disclosure__body">{children}</div>
    </details>
  );
}

export default async function HowItWorksPage() {
  const manifest = await loadManifest();

  return (
    <main id="main-content" className="np-shell how-shell">
      <PageHero
        headingId="how-heading"
        title="How Toronto 2026 works"
        className="how-hero"
        description={
          <>
            Start with the question that matches what you saw. Each section gives
            the concise answer first; open the technical method only when you need it.
          </>
        }
      />

      <nav id="methodology-questions" className="how-question-nav" aria-label="Methodology questions">
        <span>Choose a question</span>
        <ol>
          {methodologyNav.map((item) => (
            <li key={item.id}>
              <a href={`#${item.id}`}>{item.label}</a>
            </li>
          ))}
        </ol>
      </nav>

      <QuestionSection
        id="mayoral-forecast"
        title="Why should I trust the forecast?"
        answer={
          <p>
            The forecast uses a defined set of eligible polls, gives each represented
            pollster equal weight, accounts for candidates a poll did not measure, and
            publishes only a plain-language range that survives required stress tests.
            Toronto election history sets the uncertainty; it does not choose the winner.
          </p>
        }
      >
        <div className="how-disclosures">
          <MethodDisclosure
            title="How the forecast is built"
            description="Poll selection, pollster balance, the full ballot, uncertainty, and publication bands."
          >
            <div className="how-copy-grid">
              <div>
                <h3>Which polling enters?</h3>
                <p>
                  Once the candidate field is certified, the model uses polls that
                  measure that field. It keeps the newest eligible reading from each
                  pollster and gives every represented pollster equal weight. A firm
                  does not gain extra influence simply by publishing more releases.
                </p>
                <p>
                  Polls do not always report every certified candidate. Reported
                  candidates are compared within that poll, while Toronto&rsquo;s previous
                  elections inform how much support to reserve for candidates the poll
                  left unmeasured. An omitted candidate is never treated as having zero
                  support.
                </p>
              </div>
              <aside className="how-note">
                <h3>One model, several questions</h3>
                <p>Every simulated full-ballot result asks:</p>
                <ul>
                  <li>Did each candidate win?</li>
                  <li>Did Olivia Chow lose to any candidate?</li>
                  <li>Was the winning margin five points or less?</li>
                </ul>
                <p>These are summaries of the same outcomes, not separate forecasts.</p>
              </aside>
            </div>

            <MethodFlow
              label="Six steps from eligible mayoral polls to a published win-chance band"
              steps={forecastFlow}
            />

            <div className="how-copy-grid how-copy-grid--lower">
              <div>
                <h3>How uncertainty enters</h3>
                <p>
                  Historical Toronto elections supply two pieces the current polls
                  cannot reveal by themselves: how much final-ballot support polls tend
                  to leave unmeasured, and how far polling can land from the eventual
                  result. The history calibrates uncertainty; it does not dictate who
                  wins this election.
                </p>
                <p>
                  The model reruns the forecast with more emphasis on the newest sample,
                  lower and higher unmeasured-candidate shares, one sample or pollster
                  removed at a time, and an incumbency-prior sensitivity. The incumbency
                  prior checks the result; it is not part of the main model.
                </p>
              </div>

              <article className="worked-example" aria-labelledby="band-example-heading">
                <h3 id="band-example-heading">How a result becomes a public band</h3>
                <div className="worked-example__path" aria-label="Illustrative publication path">
                  <div>
                    <strong>Simulation</strong>
                    <span>A candidate wins roughly eight of every ten outcomes.</span>
                  </div>
                  <div aria-hidden="true">→</div>
                  <div>
                    <strong>Stress tests</strong>
                    <span>Required variants stay inside the same public range.</span>
                  </div>
                  <div aria-hidden="true">→</div>
                  <div>
                    <strong>Published</strong>
                    <span>“About 4 times in 5”</span>
                  </div>
                </div>
                <p>
                  This is an illustration, not a current result. If reasonable variants
                  land in different ranges, the site uses a broader out-of-five band or
                  withholds the quantity.
                </p>
              </article>
            </div>
          </MethodDisclosure>

          <MethodDisclosure
            id="polling-trends"
            title="How to read the polling chart"
            description="What the dots and LOESS curve show, and what they do not predict."
          >
            <div className="how-copy-grid">
              <div>
                <h3>The dots are reports; the curve is a summary</h3>
                <p>
                  Each dot is one candidate&rsquo;s reported share in one poll, positioned
                  at the poll&rsquo;s fieldwork date. The LOESS curve follows the local shape
                  of those dots instead of drawing a straight segment from one poll to
                  the next.
                </p>
                <p>
                  Each candidate is fitted independently. If a poll did not test a
                  candidate, it contributes no dot and no inferred zero. Curves stop at
                  the first and last observed dates, and a candidate with too few
                  distinct observations appears as dots only.
                </p>
                <p>
                  The curve makes the polling record easier to read; it is not the
                  election forecast.
                </p>
                <Link href="/polls" className="text-link">
                  See the polling record →
                </Link>
              </div>

              <figure className="poll-method-figure" aria-labelledby="poll-figure-title poll-figure-desc">
                <figcaption>
                  <h3 id="poll-figure-title">One candidate&rsquo;s polls over time</h3>
                  <p id="poll-figure-desc">
                    Six reported poll values are shown as dots. A smooth line follows
                    their local direction without passing through every dot.
                  </p>
                </figcaption>
                <svg viewBox="0 0 520 220" role="img" aria-labelledby="poll-svg-title poll-svg-desc">
                  <title id="poll-svg-title">Example LOESS trend through individual polls</title>
                  <desc id="poll-svg-desc">
                    Six poll dots rise, dip, and rise again. A smooth curve summarizes
                    their movement and stays within the observed date range.
                  </desc>
                  <line x1="42" y1="184" x2="496" y2="184" className="poll-method-figure__axis" />
                  <line x1="42" y1="28" x2="42" y2="184" className="poll-method-figure__axis" />
                  <path
                    d="M58 151 C115 137, 145 105, 205 111 S300 145, 356 111 S430 72, 480 61"
                    className="poll-method-figure__curve"
                  />
                  {[
                    [58, 155],
                    [132, 119],
                    [205, 103],
                    [284, 143],
                    [374, 92],
                    [480, 58],
                  ].map(([cx, cy]) => (
                    <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="6" className="poll-method-figure__dot" />
                  ))}
                  <text x="42" y="207">earlier</text>
                  <text x="496" y="207" textAnchor="end">later</text>
                  <text x="18" y="106" textAnchor="middle" transform="rotate(-90 18 106)">reported share</text>
                </svg>
                <div className="poll-method-figure__legend" aria-hidden="true">
                  <span><i className="poll-method-figure__legend-dot" /> individual poll</span>
                  <span><i className="poll-method-figure__legend-line" /> LOESS trend</span>
                </div>
              </figure>
            </div>
          </MethodDisclosure>
        </div>
      </QuestionSection>

      <QuestionSection
        id="council-attention"
        title="Why is this ward marked for attention?"
        answer={
          <p>
            The site puts open seats first, then compares scoreable incumbents using
            three measurements from their latest win. Candidate history, ward facts,
            and any ward polls add context beside that comparison; they are never
            blended into a hidden prediction of who will win.
          </p>
        }
      >
        <div className="council-context-grid" aria-label="Sources of council-race context">
          <article>
            <strong>Open seat</strong>
            <p>No incumbent is running, so the ward goes to the top of the attention order.</p>
          </article>
          <article>
            <strong>Incumbent index</strong>
            <p>Compares vote share, eligible-elector support, and electorate growth against the winning margin.</p>
          </article>
          <article>
            <strong>Candidate history</strong>
            <p>Shows only candidate facts that match a separately supported historical association.</p>
          </article>
          <article>
            <strong>Ward polls</strong>
            <p>Preserves reported snapshots when they exist; they do not become a ward forecast.</p>
          </article>
        </div>

        <div className="how-disclosures">
          <MethodDisclosure
            title="How the incumbent index works"
            description="The three measurements, comparative ranking, and a worked Ward 11 example."
          >
            <div className="how-prose">
              <p>
                The Councillor Defeatability Index was developed by Matt Elliott for
                City Hall Watcher. Each measurement is ranked against the other
                scoreable Toronto incumbents, then the ranks are added with equal
                weight. A higher total means more comparative exposure on those
                measurements, not a forecast of defeat.
              </p>
            </div>

            <figure className="ward-example" aria-labelledby="ward-example-heading">
              <figcaption>
                <h3 id="ward-example-heading">Why Ward 11 draws attention</h3>
                <p>
                  These are facts from Dianne Saxe&rsquo;s 2022 win and the current
                  electorate estimate, not a claim about who will win in 2026.
                </p>
              </figcaption>
              <div className="ward-example__facts" aria-label="Ward 11 index measurements">
                <article>
                  <span>Votes cast</span>
                  <strong>35%</strong>
                  <p>Saxe&rsquo;s share of valid council votes in the win.</p>
                </article>
                <article>
                  <span>Eligible voters</span>
                  <strong>11%</strong>
                  <p>Votes for Saxe as a share of everyone eligible to vote.</p>
                </article>
                <article>
                  <span>Growth versus cushion</span>
                  <strong>8,869 <small>vs</small> 123</strong>
                  <p>Estimated additional electors compared with her 123-vote winning margin.</p>
                </article>
              </div>
              <div className="ward-example__result">
                <span aria-hidden="true">↓</span>
                <p>
                  The first two values are among the lowest for Toronto incumbents,
                  while estimated electorate growth is far larger than the previous
                  winning margin. Together they explain the high index result and the
                  separate growth flag without counting the same fact twice.
                </p>
              </div>
            </figure>

            <Link href="/wards/11" className="text-link">
              See Ward 11 →
            </Link>
          </MethodDisclosure>

          <MethodDisclosure
            title="How candidate history and ward polls are used"
            description="Context that can add attention without becoming a candidate score."
          >
            <div className="how-prose">
              <p>
                Candidate-history hints appear only when a confirmed fact matches a
                separately supported historical association. They describe context;
                they are not causal claims and do not enter the Councillor
                Defeatability Index.
              </p>
              <p>
                Ward polls are preserved as reported snapshots when available. The
                site does not combine them with the incumbent index or candidate
                history to create a ward-level win probability.
              </p>
            </div>
          </MethodDisclosure>
        </div>
      </QuestionSection>

      <QuestionSection
        id="limitations"
        title="Why might a result be withheld?"
        answer={
          <p>
            An absent number or label is not zero. It means the evidence is too thin,
            required checks disagree, or a candidate identity cannot be confirmed.
            The site broadens a claim or stays silent rather than display precision the
            available evidence cannot support.
          </p>
        }
      >
        <div className="how-disclosures">
          <MethodDisclosure
            title="When a forecast number is withheld"
            description="Thin polling, unstable sensitivity checks, and limits of historical calibration."
          >
            <div className="how-prose">
              <p>
                If the current polling evidence is too thin, the forecast remains
                unavailable. If required sensitivity checks disagree, a quantity moves
                to a broader public band or is withheld. Public polls can still miss
                late movement, turnout differences, or a systematic error shared across
                firms, and the current election can behave differently from the past.
              </p>
            </div>
          </MethodDisclosure>

          <MethodDisclosure
            id="candidate-history"
            title="When a candidate-history hint is withheld"
            description="Coverage rules, identity checks, uncertainty, and examples from the audit."
          >
            <div className="how-copy-grid">
              <div>
                <h3>The evidence gate</h3>
                <p>
                  The primary comparison uses candidates with confirmed identities in
                  the 2010, 2014, and 2022 stable-boundary general elections. It accounts
                  for election, the candidate&rsquo;s role in the race, and field size, and
                  groups uncertainty by council contest.
                </p>
                <p>
                  A categorical idea needs at least five matching candidacies in five
                  contests and two elections, plus an adequate comparison group. A
                  numeric idea needs at least 20 observations in ten contests and all
                  three elections. Coverage only opens the door: the plausible effect
                  must also stay entirely on one side of no relationship.
                </p>
                <p>
                  The two Returning-councillor findings in open contests use an
                  explicitly labelled small-sample tier: four contests, the same
                  direction in all three elections, and additional influence and
                  permutation checks.
                </p>
                <p>
                  Definitions that count every race except council, or add council only
                  for some candidates, are not eligible for the public catalog. Aggregate
                  history must match the complete confirmed history a reader can see.
                </p>
              </div>
              <aside className="audit-score" aria-label="Candidate-history audit summary">
                <div>
                  <strong>{hintAuditSnapshot.tested}</strong>
                  <span>flag definitions tested</span>
                </div>
                <div>
                  <strong>{hintAuditSnapshot.published}</strong>
                  <span>currently published</span>
                </div>
                <p>
                  Published means the association can support a standalone historical
                  statement. It does not make the hint causal or predictive.
                </p>
              </aside>
            </div>

            <MethodFlow
              label="Five checks used to publish or withhold a candidate-history hint"
              steps={hintEvidenceFlow}
            />

            <div className="evidence-example-grid" aria-label="Examples from the candidate-history audit">
              {hintEvidenceExamples.map((example) => (
                <article
                  key={example.title}
                  className={`evidence-example evidence-example--${example.status}`}
                >
                  <div className="evidence-example__head">
                    <span>{example.status === "published" ? "Published" : "Withheld"}</span>
                    <h3>{example.title}</h3>
                  </div>
                  <p className="font-mono">{example.evidence}</p>
                  <p>{example.reason}</p>
                </article>
              ))}
            </div>

            <p className="how-footnote">
              “Withheld” does not mean disproven. It means the available coverage,
              identity evidence, or uncertainty cannot carry a public candidate-specific
              statement. The corrected reader-readable screen tested {hintAuditSnapshot.diagnosticTested}
              {" "}definitions and approved all {hintAuditSnapshot.diagnosticCleared} that
              cleared its evidence gate. Together with the two previously approved
              findings, that produces the current 12-flag catalog.
            </p>
          </MethodDisclosure>

          <MethodDisclosure
            title="Limits that apply across the site"
            description="Six places where the public claims are deliberately narrow."
          >
            <div className="limitations-grid">
              <article>
                <h3>Polling coverage</h3>
                <p>Public polls can miss late movement, turnout differences, or a systematic error shared across firms.</p>
              </article>
              <article>
                <h3>Simulation assumptions</h3>
                <p>Historical polling misses guide uncertainty, but the current election can still behave differently from the past.</p>
              </article>
              <article>
                <h3>Historical eras</h3>
                <p>Boundary changes and short observable career windows limit which elections can be compared on equal footing.</p>
              </article>
              <article>
                <h3>Council outcomes</h3>
                <p>Incumbent defeats are rare, leaving too little evidence for honest ward-level win probabilities.</p>
              </article>
              <article>
                <h3>Candidate identities</h3>
                <p>A past race is attached only when the person link is confirmed; unresolved histories are not guessed from names.</p>
              </article>
              <article>
                <h3>Association, not cause</h3>
                <p>A historical pattern can help describe context without proving that the candidate fact caused later vote share.</p>
              </article>
            </div>
          </MethodDisclosure>
        </div>
      </QuestionSection>

      <QuestionSection
        id="sources"
        title="Where does the data come from?"
        answer={
          <p>
            Official election and candidate records provide the foundation. Public
            poll releases supply current readings, Toronto election history calibrates
            forecast uncertainty, and versioned analytical work supplies the council
            index and candidate-history audit.
          </p>
        }
      >
        <div className="source-list">
          <article>
            <h3>Election and candidate records</h3>
            <p>Official City of Toronto election results and candidate-registration data provide council results, eligible electors, margins, and the current candidate slate.</p>
          </article>
          <article>
            <h3>Mayoral polling</h3>
            <p>Public releases from Liaison Strategies, Forum Research, Mainstreet Research, Pallas Data, Abacus Data, and Ipsos. The Polls page retains the firm and fieldwork date for every reading.</p>
          </article>
          <article>
            <h3>Forecast history</h3>
            <p>Previous Toronto mayoral elections provide the omitted-candidate and poll-to-election uncertainty used by the current forecast.</p>
          </article>
          <article>
            <h3>Councillor Defeatability Index</h3>
            <p>Matt Elliott&rsquo;s City Hall Watcher methodology supplies the three-component incumbent comparison reconstructed and backtested for this site.</p>
          </article>
          <article>
            <h3>Candidate-history audit</h3>
            <p>The upstream Council Defeatability Index project retains the tested hint catalog, evidence status, sample coverage, uncertainty, and identity audit. This page reviews contract {hintAuditSnapshot.contractVersion}.</p>
          </article>
        </div>

        <div className="how-disclosures">
          <MethodDisclosure
            id="glossary"
            title="Terms used on the site"
            description="A compact reference for labels with methodological meaning."
          >
            <div className="how-glossary">
              <dl>
                {glossary.map((entry) => (
                  <div key={entry.term}>
                    <dt>{entry.term}</dt>
                    <dd>{entry.definition}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </MethodDisclosure>
        </div>

        <div className="source-revision font-mono">
          <span>
            Methodology reviewed{" "}
            <time dateTime={hintAuditSnapshot.reviewedOn}>Aug 21, 2026</time>
          </span>
          {manifest.generated_at && <span>Site data as of {formatDate(manifest.generated_at)}</span>}
        </div>
      </QuestionSection>
    </main>
  );
}
