import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Image from "next/image";
import { CandidateExplorer, PollLab } from "./kids-vote-explorer";
import { ArrowIcon } from "./kids-vote-icons";
import { treeCandidates } from "./kids-vote-data";
import styles from "./kids-vote.module.css";

export const metadata: Metadata = {
  title: "Kids Vote Weekend — Meet the trees and explore polling",
  description:
    "Meet Toronto’s five Tree of the Year candidates, experiment with a sample poll, and learn how to vote during Kids Vote Weekend.",
  robots: { index: false, follow: false },
};

const links = {
  official:
    "https://www.toronto.ca/city-government/elections/kids-vote-weekend/",
  myVote:
    "https://www.toronto.ca/city-government/elections/voter-information/myvote/",
  voterPath:
    "https://www.toronto.ca/wp-content/uploads/2026/08/9838-22026-KVW-Path-of-the-Voter-8.5x11-Final.pdf",
  ballot:
    "https://www.toronto.ca/wp-content/uploads/2026/08/8f9a-2026-KVW-Ballot-Final-Sample-scaled.png",
  activity:
    "https://www.toronto.ca/wp-content/uploads/2026/08/8fb6-2.12026-KVW-Activity-Page-Final.pdf",
  video: "https://www.youtube.com/watch?v=MU4npipTF7s",
};

export default function KidsVoteWeekendPage() {
  return (
    <main id="main-content" className={`np-shell ${styles.page}`}>
      <section className={styles.hero} aria-labelledby="kids-vote-heading">
        <div className={styles.heroCopy}>
          <h1 id="kids-vote-heading">
            <span className={styles.heroEvent}>Kids Vote Weekend:</span>
            {" "}
            <span className={styles.heroQuestion}>
              <span>Can <b>5 kids</b>{" "}</span>
              <span>tell us what{" "}</span>
              <span><b>100 kids</b> think?</span>
            </span>
          </h1>
          <p>
            Try a mini poll with Toronto’s five tree candidates. Peek at a few
            secret choices, then see what everyone picked.
          </p>
          <a className={styles.heroAction} href="#poll-lab">
            Try the poll game
            <ArrowIcon direction="down" className={styles.arrowIcon} />
          </a>
        </div>

        <div className={styles.candidateStage}>
          <div className={styles.candidateParade} aria-label="The five Tree of the Year candidates">
            {treeCandidates.map((candidate) => (
              <figure key={candidate.id} style={{ "--candidate": candidate.colour } as CSSProperties}>
                <Image
                  src={candidate.image}
                  alt=""
                  width={candidate.imageWidth}
                  height={candidate.imageHeight}
                  sizes="(max-width: 620px) 66px, 105px"
                  loading="eager"
                />
                <figcaption>{candidate.name}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <nav className={styles.jumpNav} aria-label="On this page">
        <a href="#poll-lab"><span>1</span><strong>Poll</strong><small>Ask a few</small></a>
        <a href="#candidates"><span>2</span><strong>Trees</strong><small>Meet all five</small></a>
        <a href="#how-to-vote"><span>3</span><strong>Vote</strong><small>Plan your visit</small></a>
      </nav>

      <PollLab />

      <CandidateExplorer />

      <section className={styles.voterPath} id="how-to-vote" aria-labelledby="vote-path-heading">
        <header className={styles.sectionLead}>
          <h2 id="vote-path-heading">3. Ready to cast your real vote?</h2>
          <p>
            If you live in Toronto and are under 18, you can vote. An adult can
            help you plan where and when to go.
          </p>
        </header>

        <ol className={styles.steps}>
          <li>
            <span>1</span>
            <div>
              <h3>Pick your tree</h3>
              <p>Meet all five candidates above. Choose the one you want to vote for.</p>
            </div>
            <Image className={styles.stepCharacter} src={treeCandidates[0].image} alt="" width={treeCandidates[0].imageWidth} height={treeCandidates[0].imageHeight} sizes="70px" />
          </li>
          <li>
            <span>2</span>
            <div>
              <h3>Find a voting place</h3>
              <p>
                Ask an adult to use the City’s <a href={links.myVote}>MyVote tool</a> with
                you. There are 50 Kids Vote locations.
              </p>
            </div>
            <Image className={styles.stepCharacter} src={treeCandidates[1].image} alt="" width={treeCandidates[1].imageWidth} height={treeCandidates[1].imageHeight} sizes="70px" />
          </li>
          <li>
            <span>3</span>
            <div>
              <h3>Go on October 10 or 11</h3>
              <p>Kids Vote Weekend is open from 10 a.m. to 7 p.m. on both days.</p>
            </div>
            <Image className={styles.stepCharacter} src={treeCandidates[2].image} alt="" width={treeCandidates[2].imageWidth} height={treeCandidates[2].imageHeight} sizes="70px" />
          </li>
          <li>
            <span>4</span>
            <div>
              <h3>Mark one choice</h3>
              <p>
                An election worker will give you a ballot and show you what to do. You
                can <a href={links.ballot}>look at the sample ballot</a> before you go.
                You can vote only once.
              </p>
            </div>
            <Image className={styles.stepCharacter} src={treeCandidates[3].image} alt="" width={treeCandidates[3].imageWidth} height={treeCandidates[3].imageHeight} sizes="70px" />
          </li>
          <li>
            <span>5</span>
            <div>
              <h3>Look for the winner</h3>
              <p>
                Ballots will be counted by hand. The winning tree will be announced
                after Toronto’s October 26 municipal election.
              </p>
            </div>
            <Image className={styles.stepCharacter} src={treeCandidates[4].image} alt="" width={treeCandidates[4].imageWidth} height={treeCandidates[4].imageHeight} sizes="70px" />
          </li>
        </ol>

        <a className={styles.primaryLink} href={links.voterPath}>
          See the City’s picture guide to voting
          <ArrowIcon className={styles.arrowIcon} />
        </a>
      </section>

      <section className={styles.outcome} aria-labelledby="outcome-heading">
        <div className={styles.outcomeIntro}>
          <h2 id="outcome-heading">Your vote can grow into a real forest</h2>
          <p>
            Toronto will celebrate the winning tree throughout 2027.
          </p>
        </div>
        <div className={styles.outcomeNumber}>
          <strong>1,000</strong>
          <span>winning trees planted on public land</span>
        </div>
        <dl className={styles.outcomeDetails}>
          <div>
            <dt>At school</dt>
            <dd>Schools can get a sapling to plant</dd>
          </div>
          <div>
            <dt>At home</dt>
            <dd>People can get free saplings at public tree events</dd>
          </div>
        </dl>
        <div className={styles.outcomeCharacters} aria-hidden="true">
          {treeCandidates.map((candidate) => (
            <Image key={candidate.id} src={candidate.image} alt="" width={candidate.imageWidth} height={candidate.imageHeight} sizes="70px" />
          ))}
        </div>
      </section>

      <section className={styles.resources} aria-labelledby="resources-heading">
        <header className={styles.sectionLead}>
          <h2 id="resources-heading">Keep exploring</h2>
          <p>Official activities and guides from Toronto Elections.</p>
        </header>
        <ul>
          <li><a href={links.activity}><strong>Do the activity sheet</strong><span>Word search and tree-candidate colouring page</span><b>Open the PDF <ArrowIcon className={styles.arrowIcon} /></b></a></li>
          <li><a href={links.ballot}><strong>Practise with a ballot</strong><span>See what you will mark at the voting place</span><b>See the ballot <ArrowIcon className={styles.arrowIcon} /></b></a></li>
          <li><a href={links.video}><strong>Watch how voting works</strong><span>The City’s Kids Vote Weekend video</span><b>Watch the video <ArrowIcon className={styles.arrowIcon} /></b></a></li>
          <li><a href={links.official}><strong>Visit the official page</strong><span>Event details and every City resource</span><b>Go to Toronto.ca <ArrowIcon className={styles.arrowIcon} /></b></a></li>
        </ul>
        <p className={styles.sourceNote}>
          Candidate facts, event details, and linked resources come from the City of
          Toronto’s Kids Vote Weekend materials, updated September 1, 2026.
        </p>
      </section>
    </main>
  );
}
