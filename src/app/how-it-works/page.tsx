import Link from "next/link";
import { loadManifest } from "@/lib/feeds";
import { formatDate } from "@/lib/format";

export const metadata = {
  title: "How it works — Toronto 2026",
  description: "How the mayoral forecast, the polls, and the council assessment are made.",
};

export default async function HowItWorksPage() {
  const manifest = await loadManifest();

  return (
    <main id="main-content" className="np-shell">
      <section className="race-hero" aria-labelledby="how-heading">
        <p className="np-kicker">Methodology</p>
        <h1 id="how-heading">How it works</h1>
        <p className="race-hero-dek">
          Three separate things live on this site: a forecast of the mayor&rsquo;s
          race, the raw polls behind it, and an assessment of the 25 council
          races. They are kept deliberately separate, and each is honest about
          what it can and can&rsquo;t say.
        </p>
      </section>

      <section className="ward-detail-section">
        <h2>The mayoral forecast</h2>
        <p>
          The forecast answers one question for each candidate:{" "}
          <em>how likely are they to win?</em>{" "}We don&rsquo;t publish a single
          precise number, because that would imply more certainty than the
          evidence supports. Instead we publish a <strong>chance</strong>{" "}in
          plain language — &ldquo;about 4 in 5,&rdquo; &ldquo;about 1 in 5,&rdquo;
          &ldquo;less than 1 in 10.&rdquo;
        </p>
        <p>
          Behind each phrase is a band of probability. We only publish a
          candidate&rsquo;s chance when several independent versions of the model
          — dropping a poll, leaning on different assumptions — all agree on the
          same band. If they don&rsquo;t agree, we&rsquo;d rather say nothing than
          guess, so that quantity simply isn&rsquo;t shown.
        </p>
      </section>

      <section className="ward-detail-section">
        <h2>The polls</h2>
        <p>
          The <Link href="/polls" className="text-link">polls page</Link> shows
          every public poll of the current field as an individual reading over
          time. It is <strong>not</strong> a modelled average and not the
          forecast — just the raw record, so you can see the evidence for
          yourself. Different polls test different candidates, which is why some
          lines have gaps.
        </p>
      </section>

      <section className="ward-detail-section">
        <h2>The council races</h2>
        <p>
          For the 25 council wards we publish <strong>no</strong> win
          probabilities. Toronto council incumbents rarely lose — historically
          about 6% of the time — so a single number would be misleading. Instead
          each ward carries <em>attention markers</em>: whether the seat is open,
          how the incumbent won last time, and whether structural signals (like a
          ward growing faster than the incumbent&rsquo;s past margin) suggest the
          race is worth watching. A fired marker means <em>pay attention</em>, not
          &ldquo;the incumbent will lose.&rdquo;
        </p>
        <p>
          The council defeatability signals build on the City Hall Watcher
          Defeatability Index by Matt Elliott.
        </p>
      </section>

      <section className="ward-detail-section">
        <h2>Sources</h2>
        <p>
          Mayoral polling is compiled from public releases by firms including
          Liaison Strategies, Forum Research, Mainstreet Research, Pallas Data,
          Abacus Data, and Ipsos. Election results come from the City of
          Toronto&rsquo;s official records. Candidate registrations come from the
          City&rsquo;s nominations data.
        </p>
        {manifest.generated_at && (
          <p className="font-mono" style={{ fontSize: "0.7rem", color: "var(--text-faint)" }}>
            Data as of {formatDate(manifest.generated_at)}.
          </p>
        )}
      </section>
    </main>
  );
}
