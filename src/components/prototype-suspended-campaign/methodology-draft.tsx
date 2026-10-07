/**
 * PROTOTYPE (throwaway): draft methodology copy for /how-it-works, shown under
 * every variant so it can be read in context. Not part of the variants' layout.
 */
export function MethodologyDraft() {
  return (
    <section className="section" aria-labelledby="prototype-copy-heading">
      <div className="wrap" style={{ border: "2px dashed #999", padding: "1.25rem 1.5rem", borderRadius: 8 }}>
        <p style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, margin: 0 }}>
          PROTOTYPE · draft copy for /how-it-works (not shown on the homepage)
        </p>
        <h2 id="prototype-copy-heading">Which polling enters? (replaces the paragraph at page.tsx:120)</h2>
        <p>
          Chris Alexander ended his campaign on October 6. He is still on the ballot and can still
          receive votes. Polls taken on or after that date enter the model as a comparison between Chow
          and Bradford, whether or not they still name him; any share they report for him is set aside.
          When one poll asks both the full field and a question offering only Chow and Bradford, the
          full-field question is the one that counts.
        </p>
        <p>
          We found ten past cases of a Canadian mayoral candidate ending a campaign but staying on the
          ballot. Those polled beforehand kept between about 3% and 25% of the support they had in
          their last poll. The forecast
          draws Alexander&rsquo;s election-day share from that record, about 1% today, and shares the
          rest of his support out among the other candidates in proportion to their own. It does not
          assume where his supporters go. When Mainstreet asked voters in late September to choose
          between only Chow and Bradford, the extra votes split almost evenly, which would leave the
          odds unchanged.
        </p>
        <h2>Polling chart default view (replaces the sentence at page.tsx:218)</h2>
        <p>
          The default &ldquo;Since nominations closed&rdquo; view shows polls reporting Chow and Bradford
          with fieldwork completed after the August 21 nomination deadline. Polls taken before October 6
          also report Alexander.
        </p>
      </div>
    </section>
  );
}
