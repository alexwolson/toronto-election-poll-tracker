import Link from "next/link";
import { MethodFlow } from "@/components/method-flow";
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

function SectionHeading({
  id,
  number,
  title,
  dek,
}: {
  id: string;
  number: string;
  title: string;
  dek: string;
}) {
  return (
    <header className="how-section__heading">
      <p className="np-kicker">{number}</p>
      <h2 id={id}>{title}</h2>
      <p>{dek}</p>
    </header>
  );
}

export default async function HowItWorksPage() {
  const manifest = await loadManifest();

  return (
    <main id="main-content" className="np-shell how-shell">
      <section className="race-hero how-hero" aria-labelledby="how-heading">
        <p className="np-kicker">Methodology</p>
        <h1 id="how-heading">How Toronto 2026 works</h1>
        <p className="race-hero-dek">
          This site does three different jobs: it forecasts the mayor&rsquo;s race,
          charts the public polling record, and identifies council races worth a
          closer look. Here is the evidence and reasoning behind each one.
        </p>
      </section>

      <section className="how-primer" aria-labelledby="three-views-heading">
        <h2 id="three-views-heading" className="sr-only">
          Three views of the election
        </h2>
        <div className="how-primer__grid">
          <article>
            <p className="np-kicker">Mayoral forecast</p>
            <h3>What could happen</h3>
            <p>
              Estimates each candidate&rsquo;s chance of winning from eligible polls
              and Toronto&rsquo;s historical polling record.
            </p>
            <a href="#mayoral-forecast">Follow the forecast method ↓</a>
          </article>
          <article>
            <p className="np-kicker">Polling trends</p>
            <h3>What pollsters reported</h3>
            <p>
              Preserves every public reading and smooths each candidate&rsquo;s series
              to make movement over time easier to see.
            </p>
            <a href="#polling-trends">Read the chart correctly ↓</a>
          </article>
          <article>
            <p className="np-kicker">Council attention</p>
            <h3>Where to look closer</h3>
            <p>
              Orders the 25 wards by attention and explains the evidence around
              incumbents, open seats, candidates, and ward polls.
            </p>
            <a href="#council-attention">See how wards are assessed ↓</a>
          </article>
        </div>
      </section>

      <nav className="how-jump-nav" aria-label="On this page">
        <span>On this page</span>
        <ul>
          {methodologyNav.map((item) => (
            <li key={item.id}>
              <a href={`#${item.id}`}>{item.label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <section id="mayoral-forecast" className="how-section" aria-labelledby="forecast-method-heading">
        <SectionHeading
          id="forecast-method-heading"
          number="01 · Mayoral forecast"
          title="From polls to chances of winning"
          dek="The forecast builds a plausible full ballot, simulates election day many times, and publishes only the precision that survives its stress tests."
        />

        <div className="how-copy-grid">
          <div>
            <h3>Which polling enters the forecast?</h3>
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
            <p className="np-kicker">One model, several questions</p>
            <p>Every simulated full-ballot result answers the same set of questions:</p>
            <ul>
              <li>Did each candidate win?</li>
              <li>Did Olivia Chow lose to any candidate?</li>
              <li>Was the winning margin five points or less?</li>
            </ul>
            <p>Those are summaries of the same outcomes, not separate forecasts.</p>
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
              The model then reruns the forecast with more emphasis on the newest
              sample, lower and higher unmeasured-candidate shares, one sample or
              pollster removed at a time, and an incumbency-prior sensitivity. The
              incumbency prior is a check on the result, not part of the main model.
            </p>
          </div>

          <article className="worked-example" aria-labelledby="band-example-heading">
            <p className="np-kicker">Illustration, not a current result</p>
            <h3 id="band-example-heading">How a simulated result becomes a public band</h3>
            <div className="worked-example__path" aria-label="Example publication path">
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
              If reasonable variants land in different ranges, the site uses a
              broader out-of-five band or withholds the quantity. It does not expose
              an unstable exact percentage.
            </p>
          </article>
        </div>
      </section>

      <section id="polling-trends" className="how-section" aria-labelledby="polling-method-heading">
        <SectionHeading
          id="polling-method-heading"
          number="02 · Polling trends"
          title="The dots are reports; the curve is a summary"
          dek="The Polls page preserves the individual readings and adds one descriptive curve for each candidate."
        />

        <div className="how-copy-grid">
          <div>
            <h3>Reading the chart</h3>
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
              This makes the polling record easier to read without turning it into
              the election forecast. The forecast uses its own full-ballot and
              uncertainty model described above.
            </p>
            <Link href="/polls" className="text-link">
              See the polling record →
            </Link>
          </div>

          <figure className="poll-method-figure" aria-labelledby="poll-figure-title poll-figure-desc">
            <figcaption>
              <p className="np-kicker">A descriptive smoother</p>
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
      </section>

      <section id="council-attention" className="how-section" aria-labelledby="council-method-heading">
        <SectionHeading
          id="council-method-heading"
          number="03 · Council attention"
          title="Why a ward rises toward the top"
          dek="Council evidence is thinner than mayoral polling, so the site organizes attention instead of assigning each candidate a win probability."
        />

        <div className="how-copy-grid">
          <div>
            <h3>Four kinds of context</h3>
            <p>
              Open seats appear first because a race without an incumbent is
              inherently unsettled. For wards with incumbents, the Councillor
              Defeatability Index compares three measurements from the incumbent&rsquo;s
              latest win. Separate ward facts, candidate-history hints, and any ward
              polls add context alongside that index; they are not blended into a
              hidden winner score.
            </p>
            <p>
              The Councillor Defeatability Index was developed by Matt Elliott for
              City Hall Watcher. Each of its three measurements is ranked against
              the other scoreable Toronto incumbents, then the ranks are added with
              equal weight. A higher total means more comparative exposure on those
              measurements.
            </p>
          </div>
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
        </div>

        <figure className="ward-example" aria-labelledby="ward-example-heading">
          <figcaption>
            <p className="np-kicker">Worked example · Ward 11, University–Rosedale</p>
            <h3 id="ward-example-heading">Why Dianne Saxe&rsquo;s ward draws attention</h3>
            <p>
              These are concrete facts from Saxe&rsquo;s 2022 win and the current
              electorate estimate—not a claim about who will win in 2026.
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
      </section>

      <section id="candidate-history" className="how-section" aria-labelledby="history-method-heading">
        <SectionHeading
          id="history-method-heading"
          number="04 · Candidate-history evidence"
          title="A plausible idea is not automatically a public hint"
          dek={`The current upstream audit tested ${hintAuditSnapshot.tested} candidate-facing flag definitions and publishes ${hintAuditSnapshot.published}. Aggregate history means every confirmed previous elected-office race, including council; a hint may instead name one office type explicitly.`}
        />

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
              must also stay entirely on one side of no relationship. The two
              Returning-councillor findings in open contests use an explicitly
              labelled small-sample tier: four contests, the same direction in all
              three elections, and additional influence and permutation checks.
            </p>
            <p>
              Repeating in the same direction in every election earns the stronger
              evidence label. A pooled result can still publish when it clears the
              defined gate, but the site records that weaker level rather than
              pretending the pattern was universal.
            </p>
            <p>
              Definitions that count every race except council—or add council only
              for some candidates—are not eligible for the public catalog. The
              history used by an aggregate hint must match the complete confirmed
              history a reader can see.
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
              statement. It does not make the hint causal, predictive, or part of
              the Councillor Defeatability Index.
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
          findings, that produces the current 12-flag catalog. Overlapping findings
          are combined into concise facts on ward pages. Continuous margin findings
          are not given an up/down arrow because the audit supplies no candidate-level
          cutoff, and the paired unsuccessful-council-run comparison stays in the
          audit rather than appearing as awkward candidate-card copy.
        </p>
      </section>

      <section id="limitations" className="how-section" aria-labelledby="limitations-heading">
        <SectionHeading
          id="limitations-heading"
          number="05 · Limits"
          title="What the evidence cannot settle"
          dek="The site narrows its claims where the data is thin, historically unusual, or sensitive to reasonable modelling choices."
        />
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

        <aside className="withheld-example" aria-labelledby="withheld-heading">
          <div>
            <p className="np-kicker">Why might no number appear?</p>
            <h3 id="withheld-heading">Silence can be the result of the method</h3>
          </div>
          <p>
            If the current polling evidence is too thin, the forecast remains
            unavailable. If required sensitivity checks disagree, a quantity moves
            to a broader public band or is withheld. The absent number is not zero;
            it is a claim the evidence has not earned.
          </p>
        </aside>
      </section>

      <section id="glossary" className="how-section how-glossary" aria-labelledby="glossary-heading">
        <SectionHeading
          id="glossary-heading"
          number="06 · Glossary"
          title="Terms used on the site"
          dek="A short reference for the labels that carry methodological meaning."
        />
        <dl>
          {glossary.map((entry) => (
            <div key={entry.term}>
              <dt>{entry.term}</dt>
              <dd>{entry.definition}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="sources" className="how-section how-sources" aria-labelledby="sources-heading">
        <SectionHeading
          id="sources-heading"
          number="07 · Sources"
          title="Records, polling, and attribution"
          dek="The public pages combine official election records, published polls, and versioned analytical work."
        />
        <div className="source-list">
          <article>
            <h3>Election and candidate records</h3>
            <p>Official City of Toronto election results and candidate-registration data provide council results, eligible electors, margins, and the current candidate slate.</p>
          </article>
          <article>
            <h3>Mayoral polling</h3>
            <p>Public releases from firms including Liaison Strategies, Forum Research, Mainstreet Research, Pallas Data, Abacus Data, and Ipsos. The Polls page retains the firm and fieldwork date for every reading.</p>
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
            <p>The upstream Council Defeatability Index project retains the complete tested hint catalog, evidence status, sample coverage, uncertainty, and identity audit. This page reviews contract {hintAuditSnapshot.contractVersion}.</p>
          </article>
        </div>
        <div className="source-revision font-mono">
          <span>
            Methodology reviewed{" "}
            <time dateTime={hintAuditSnapshot.reviewedOn}>Aug 21, 2026</time>
          </span>
          {manifest.generated_at && <span>Site data as of {formatDate(manifest.generated_at)}</span>}
        </div>
      </section>
    </main>
  );
}
