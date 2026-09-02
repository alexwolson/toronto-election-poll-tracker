import type { Metadata } from "next";
import { Newsreader, Source_Sans_3, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { MastheadNav } from "@/components/masthead-nav";

const kidsVoteDirectionContract = `<!--
THESIS: A hands-on poll experiment lets children discover that a sample is a useful clue, not a promise; it refuses the adult election-dashboard default.
OWN-WORLD: Toronto's warm civic broadsheet becomes a ruled activity sheet, with ink-blue lesson fields, square controls, official leaf characters, generous type, and no toy-app chrome.
STORY: Ask part of a pretend crowd, compare repeated results with all 100 answers, meet the real tree candidates, then understand how a ballot becomes a decision.
FIRST VIEWPORT: “Kids Vote Weekend” and a concrete 5-versus-100 question lead to one blue poll action; five staggered leaf characters gather beside it; three child-sized event facts form the strip below.
FORM: Civic activity booklet, form 5 of 7 in the grounded list; seed key 0cd2cc68.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
-->`;

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const ibmMono = IBM_Plex_Mono({
  variable: "--font-ibm-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Toronto 2026 Elections",
  description:
    "A mayoral forecast, the polls behind it, and Toronto's council and school-board races.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${sourceSans.variable} ${newsreader.variable} ${ibmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <template
          data-impeccable-contract="kids-vote-weekend"
          dangerouslySetInnerHTML={{ __html: kidsVoteDirectionContract }}
        />
        <div className="site-bg" aria-hidden="true" />
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <header className="site-header">
          <div className="site-brand">
            <div className="font-heading">Toronto Election 2026</div>
            <div className="font-mono">Evidence-first municipal election guide</div>
          </div>
          <MastheadNav />
        </header>
        {children}
      </body>
    </html>
  );
}
