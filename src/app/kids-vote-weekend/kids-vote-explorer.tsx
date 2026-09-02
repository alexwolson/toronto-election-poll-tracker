"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import Image from "next/image";
import { treeCandidates, type TreeCandidate } from "./kids-vote-data";
import { ArrowIcon } from "./kids-vote-icons";
import styles from "./kids-vote.module.css";

type PollCounts = Record<string, number>;

type PollSample = {
  indices: number[];
  counts: PollCounts;
  size: number;
};

const sampleSizes = [5, 20, 50] as const;
const samplesBeforePrediction = 3;
const fullGroupCounts: PollCounts = {
  basswood: 30,
  "paper-birch": 25,
  "red-oak": 20,
  "sugar-maple": 15,
  "white-pine": 10,
};

function candidateStyle(candidate: TreeCandidate) {
  return { "--candidate": candidate.colour } as CSSProperties;
}

function emptyCounts(): PollCounts {
  return Object.fromEntries(treeCandidates.map((candidate) => [candidate.id, 0]));
}

function buildPracticeGroup() {
  return treeCandidates.flatMap((candidate) =>
    Array.from({ length: fullGroupCounts[candidate.id] }, () => candidate.id),
  );
}

const practiceGroup = buildPracticeGroup();

function drawPoll(size: number): PollSample {
  const indices = Array.from({ length: practiceGroup.length }, (_, index) => index);

  for (let index = indices.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [indices[index], indices[swapIndex]] = [indices[swapIndex], indices[index]];
  }

  const sampledIndices = indices.slice(0, size);
  const counts = sampledIndices.reduce((result, index) => {
    result[practiceGroup[index]] += 1;
    return result;
  }, emptyCounts());

  return { indices: sampledIndices, counts, size };
}

function leaders(counts: PollCounts) {
  const highest = Math.max(...Object.values(counts));
  return treeCandidates.filter((candidate) => counts[candidate.id] === highest);
}

function joinCandidateNames(candidates: readonly TreeCandidate[]) {
  if (candidates.length === 1) return candidates[0].name;
  if (candidates.length === 2) return `${candidates[0].name} and ${candidates[1].name}`;
  return `${candidates.slice(0, -1).map((candidate) => candidate.name).join(", ")}, and ${candidates.at(-1)?.name}`;
}

function ResultTallies({
  counts,
  total,
  label,
  selectedId,
  onChoose,
  choicesLocked = false,
}: {
  counts: PollCounts;
  total: number;
  label: string;
  selectedId?: string | null;
  onChoose?: (candidateId: string) => void;
  choicesLocked?: boolean;
}) {
  return (
    <div className={styles.resultTallies} aria-label={label}>
      {treeCandidates.map((candidate) => {
        const count = counts[candidate.id];
        const share = (count / total) * 100;
        const isSelected = selectedId === candidate.id;
        const contents = (
          <>
            <span className={styles.tallyMark} aria-hidden="true">
              <Image
                src={candidate.image}
                alt=""
                width={candidate.imageWidth}
                height={candidate.imageHeight}
                sizes="40px"
              />
            </span>
            <span className={styles.tallyName}>{candidate.name}</span>
            <span className={styles.tallyCount}>
              <strong>{count}</strong>
              <span>{count === 1 ? "kid" : "kids"}</span>
              <small>{share.toFixed(0)}%</small>
            </span>
          </>
        );

        if (onChoose) {
          const choiceState = choicesLocked
            ? isSelected ? ". Your prediction." : ""
            : `. Choose ${candidate.name} as your prediction.`;

          return (
            <button
              className={`${styles.tallyRow} ${styles.tallyChoice}${isSelected ? ` ${styles.tallyChoiceSelected}` : ""}`}
              key={candidate.id}
              type="button"
              aria-label={`${candidate.name}: ${count} of ${total} answers, ${share.toFixed(0)} percent${choiceState}`}
              aria-pressed={isSelected}
              disabled={choicesLocked}
              onClick={() => onChoose(candidate.id)}
              style={candidateStyle(candidate)}
            >
              {contents}
            </button>
          );
        }

        return (
          <div
            className={styles.tallyRow}
            key={candidate.id}
            aria-label={`${candidate.name}: ${count} of ${total} answers, ${share.toFixed(0)} percent`}
          >
            {contents}
          </div>
        );
      })}
    </div>
  );
}

export function PollLab() {
  const [sampleSize, setSampleSize] = useState<(typeof sampleSizes)[number]>(5);
  const [sample, setSample] = useState<PollSample | null>(null);
  const [previousLeaderIds, setPreviousLeaderIds] = useState<string[]>([]);
  const [showFullGroup, setShowFullGroup] = useState(false);
  const [predictionId, setPredictionId] = useState<string | null>(null);
  const [predictionLocked, setPredictionLocked] = useState(false);
  const [samplesRun, setSamplesRun] = useState(0);

  const sampledIndices = useMemo(() => new Set(sample?.indices ?? []), [sample]);
  const pollLeaders = sample ? leaders(sample.counts) : [];
  const previousLeaders = treeCandidates.filter((candidate) => previousLeaderIds.includes(candidate.id));
  const fullGroupLeader = treeCandidates[0];
  const predictedCandidate = treeCandidates.find((candidate) => candidate.id === predictionId) ?? null;
  const completedSamples = Math.min(samplesRun, samplesBeforePrediction);
  const samplesRemaining = Math.max(samplesBeforePrediction - samplesRun, 0);
  const predictionIsOpen = samplesRun >= samplesBeforePrediction;

  function chooseSampleSize(size: (typeof sampleSizes)[number]) {
    setSampleSize(size);
  }

  function runPoll() {
    if (sample) {
      setPreviousLeaderIds(leaders(sample.counts).map((candidate) => candidate.id));
    }
    setSample(drawPoll(sampleSize));
    setShowFullGroup(false);
    setPredictionId(null);
    setPredictionLocked(false);
    setSamplesRun((count) => count + 1);
  }

  const currentLeaderText = sample
    ? pollLeaders.length === 1
      ? `${pollLeaders[0].name} is ahead`
      : pollLeaders.length === 2
        ? `${joinCandidateNames(pollLeaders)} are tied`
        : pollLeaders.length === treeCandidates.length
          ? "All five trees are tied"
          : `${pollLeaders.length} trees are tied`
    : "";
  const previousBrief = previousLeaders.length === 0
    ? ""
    : previousLeaders.length === 1
      ? `${previousLeaders[0].name} ahead`
      : previousLeaders.length === 2
        ? `${joinCandidateNames(previousLeaders)} tied`
        : previousLeaders.length === treeCandidates.length
          ? "all five trees tied"
          : `${previousLeaders.length} trees tied`;
  const currentBrief = pollLeaders.length === 1
    ? `${pollLeaders[0].name} ahead`
    : pollLeaders.length === 2
      ? `${joinCandidateNames(pollLeaders)} tied`
      : pollLeaders.length === treeCandidates.length
        ? "all five trees tied"
        : `${pollLeaders.length} trees tied`;
  const crowdedResult = pollLeaders.length > 2;
  const sameRepeatResult = previousLeaderIds.length > 0
    && previousLeaderIds.length === pollLeaders.length
    && pollLeaders.every((candidate) => previousLeaderIds.includes(candidate.id));
  const leaderStatus = currentLeaderText ? `${currentLeaderText}.` : "";
  const repeatMessage = previousLeaders.length > 0
    ? sameRepeatResult
      ? pollLeaders.length === 1
        ? `New group, same result. ${pollLeaders[0].name} is still ahead, though the numbers may change.`
        : crowdedResult
          ? `New group, same result. ${pollLeaders.length === treeCandidates.length ? "All five trees" : `${pollLeaders.length} trees`} are tied again, though the numbers may change.`
          : `New group, same result. ${joinCandidateNames(pollLeaders)} are tied again, though the numbers may change.`
      : `New group, new result. Last time: ${previousBrief}. This time: ${currentBrief}.`
    : "";
  const comparisonMessage = sample
    ? pollLeaders.length === 1 && pollLeaders[0].id === fullGroupLeader.id
      ? "The kids you asked pointed to the same leader, but their numbers were different because they were only part of the group."
      : pollLeaders.some((candidate) => candidate.id === fullGroupLeader.id)
        ? `${fullGroupLeader.name} was one of the leaders in your small group. In all 100, it is ahead on its own.`
        : "The kids you asked pointed to a different leader. That can happen when a poll asks only part of a group."
    : "";
  const predictionMessage = predictedCandidate
    ? predictedCandidate.id === fullGroupLeader.id
      ? `You picked ${predictedCandidate.name}. It is ahead in all 100.`
      : `You picked ${predictedCandidate.name}. ${fullGroupLeader.name} is ahead in all 100.`
    : "";
  const guideHeading = samplesRemaining === 0
    ? "Three groups done. Make your prediction!"
    : samplesRemaining === 1
      ? "One more group before your prediction"
      : samplesRun === 0
        ? "First, ask 3 random groups"
        : `Now ask ${samplesRemaining} more groups`;
  const guideInstruction = samplesRemaining === 0
    ? "You can keep sampling, or choose who you think is winning."
    : samplesRun === 0
      ? "Keep the same group size or switch it each time."
      : "Keep this group size or try another one.";
  const nextSampleLabel = samplesRemaining > 0
    ? `Ask ${sampleSize} kids — group ${samplesRun + 1} of ${samplesBeforePrediction}`
    : `Ask another group of ${sampleSize}`;
  const liveMessage = showFullGroup
    ? `All 100 choices are revealed. ${predictionMessage} ${comparisonMessage}`
    : sample && samplesRemaining > 0
      ? `${leaderStatus} ${samplesRemaining} more ${samplesRemaining === 1 ? "group" : "groups"} before your prediction.`
      : leaderStatus;

  function toggleFullGroup() {
    if (!showFullGroup && predictionId) {
      setPredictionLocked(true);
    }
    setShowFullGroup((shown) => !shown);
  }

  return (
    <section className={styles.pollLab} id="poll-lab" aria-labelledby="poll-lab-heading">
      <header className={styles.sectionLead}>
        <h2 id="poll-lab-heading">1. Ask a few, then check all 100</h2>
        <p>
          Imagine 100 kids each chose a tree. Ask at least three random groups,
          compare their choices, then predict who is winning in all 100.
        </p>
      </header>

      <p className={styles.liveStatus} aria-live="polite">{liveMessage}</p>

      <div className={styles.pollWorkbench}>
        <div className={styles.labControls}>
          <div className={styles.sampleGuide}>
            <div>
              <strong>{guideHeading}</strong>
              <p>{guideInstruction}</p>
            </div>
            <ol aria-label={`${completedSamples} of ${samplesBeforePrediction} groups asked`}>
              {Array.from({ length: samplesBeforePrediction }, (_, index) => {
                const step = index + 1;
                const isDone = step <= completedSamples;
                const isNext = !isDone && step === completedSamples + 1;
                return (
                  <li
                    className={isDone ? styles.sampleStepDone : isNext ? styles.sampleStepNext : undefined}
                    key={step}
                    aria-current={isNext ? "step" : undefined}
                  >
                    <span>{step}</span>
                    <small>{isDone ? "Asked" : isNext ? "Next" : "Later"}</small>
                  </li>
                );
              })}
            </ol>
          </div>

          <fieldset>
            <legend>{sample ? "How many kids in the next group?" : "How many kids will you ask?"}</legend>
            <div className={styles.sizeChoices}>
              {sampleSizes.map((size) => (
                <button
                  type="button"
                  key={size}
                  aria-pressed={sampleSize === size}
                  onClick={() => chooseSampleSize(size)}
                >
                  <strong>{size}</strong>
                  <span>{size === 5 ? "Wobbly clue" : size === 20 ? "Steadier clue" : "Steadiest clue"}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className={styles.runPollWrap}>
            <button className={styles.runPollButton} type="button" onClick={runPoll}>
              {nextSampleLabel}
            </button>
            <p>
              Everyone has the same chance to be picked.
            </p>
          </div>
        </div>

        <div className={styles.labPlay}>
          <div className={styles.crowdPanel}>
            <header className={styles.crowdHeader}>
              <div>
                <h3>All 100 choices</h3>
                <p>{showFullGroup ? "Grouped by tree so you can compare." : sample ? "The kids you asked are showing." : "All 100 choices are hidden."}</p>
              </div>
              <strong>{showFullGroup ? 100 : sample ? sample.size : 0}<span> / 100</span></strong>
            </header>

            <div
              className={styles.crowd}
              role="img"
              aria-label={
                showFullGroup
                  ? `All 100 tree choices are revealed and grouped by tree. The ${sample?.size ?? sampleSize} kids asked have blue outlines.`
                  : sample
                    ? `${sample.size} randomly chosen tree choices are revealed out of 100.`
                    : "100 hidden tree choices."
              }
            >
              {practiceGroup.map((candidateId, index) => {
                const candidate = treeCandidates.find((item) => item.id === candidateId) ?? treeCandidates[0];
                const isSampled = sampledIndices.has(index);
                const isRevealed = showFullGroup || isSampled;
                const crowdStyle = {
                  ...candidateStyle(candidate),
                  "--reveal-delay": `${Math.floor(index / 10) * 24}ms`,
                } as CSSProperties;

                return (
                  <span
                    key={index}
                    className={`${styles.crowdPerson}${isRevealed ? ` ${styles.crowdPersonRevealed}` : ""}${isSampled ? ` ${styles.crowdPersonSampled}` : ""}`}
                    style={isRevealed ? crowdStyle : undefined}
                    aria-hidden="true"
                  >
                    {isRevealed ? (
                      <Image
                        className={styles.crowdLeaf}
                        src={candidate.image}
                        alt=""
                        width={candidate.imageWidth}
                        height={candidate.imageHeight}
                        sizes="(max-width: 420px) 24px, 32px"
                      />
                    ) : (
                      <span className={styles.crowdQuestion}>?</span>
                    )}
                  </span>
                );
              })}
            </div>

            <p className={styles.crowdCaption}>
              {showFullGroup
                ? "The biggest groups are the most popular. Blue rings mark the kids you asked."
                : sample
                  ? `These ${sample.size} leaf characters show what the kids you asked chose.`
                  : "Each question mark hides one tree choice."}
            </p>
          </div>

          <aside className={styles.cluePanel} aria-label="Results from the kids you asked">
            {sample ? (
              <>
                <div className={`${styles.resultHeading}${crowdedResult ? ` ${styles.resultHeadingCrowded}` : ""}`}>
                  <div className={styles.resultLeaderArt} aria-hidden="true">
                    {pollLeaders.map((candidate) => (
                      <Image
                        key={candidate.id}
                        src={candidate.image}
                        alt=""
                        width={candidate.imageWidth}
                        height={candidate.imageHeight}
                        sizes={crowdedResult ? "52px" : "72px"}
                      />
                    ))}
                  </div>
                  <div className={styles.resultLeaderCopy}>
                    <h3>The kids you asked: {leaderStatus}</h3>
                  </div>
                </div>

                {previousLeaders.length > 0 && (
                  <p className={styles.previousClue}>
                    {repeatMessage}
                  </p>
                )}

                {predictionIsOpen ? (
                  <fieldset className={styles.predictionChoices}>
                    <legend>Who do you think is winning in all 100?</legend>
                    <p>Use your three groups as clues. Then pick one tree.</p>
                    <ResultTallies
                      counts={sample.counts}
                      total={sample.size}
                      label="Answers from the kids you asked and prediction choices"
                      selectedId={predictionId}
                      onChoose={setPredictionId}
                      choicesLocked={predictionLocked}
                    />
                    <p className={styles.predictionStatus} aria-live="polite">
                      {predictedCandidate
                        ? `Your pick: ${predictedCandidate.name}.`
                        : "Pick a tree before you reveal all 100."}
                    </p>
                  </fieldset>
                ) : (
                  <div className={styles.predictionGate} role="status" aria-live="polite">
                    <strong>
                      {samplesRemaining} more {samplesRemaining === 1 ? "group" : "groups"} before your prediction
                    </strong>
                    <span>See whether the leader changes next time.</span>
                  </div>
                )}

                <div className={styles.resultActions}>
                  <button className={styles.repeatButton} type="button" onClick={runPoll}>
                    {nextSampleLabel}
                  </button>
                  {predictionIsOpen && (
                    <button
                      className={`${styles.revealButton}${predictionId && !showFullGroup ? ` ${styles.revealReady}` : ""}`}
                      type="button"
                      aria-controls="full-group-result"
                      aria-expanded={showFullGroup}
                      disabled={!predictionId}
                      onClick={toggleFullGroup}
                    >
                      {showFullGroup
                        ? "Hide all 100 choices"
                        : "Reveal all 100 choices"}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className={styles.emptyClue}>
                <Image
                  src={treeCandidates[0].image}
                  alt=""
                  width={treeCandidates[0].imageWidth}
                  height={treeCandidates[0].imageHeight}
                  sizes="84px"
                  aria-hidden="true"
                />
                <span aria-hidden="true">?</span>
                <h3>Your result will appear here</h3>
                <p>Choose a group size, then ask them at random.</p>
              </div>
            )}
          </aside>
        </div>

        {sample && showFullGroup && (
          <div className={styles.fullGroupResult} id="full-group-result">
            <div className={styles.fullGroupHeader}>
              <div>
                <h3>All 100 kids: {fullGroupLeader.name} is ahead.</h3>
              </div>
              <Image
                src={fullGroupLeader.image}
                alt=""
                width={fullGroupLeader.imageWidth}
                height={fullGroupLeader.imageHeight}
                sizes="70px"
                aria-hidden="true"
              />
            </div>
            <ResultTallies counts={fullGroupCounts} total={100} label="Answers from all 100 kids" />
            <p className={styles.comparisonNote}>
              <strong>{predictionMessage}</strong>
              <span>{comparisonMessage}</span>
            </p>
          </div>
        )}
      </div>

      {sample && (
        <div className={styles.lessonDebrief}>
          <h3>A poll and an election do different jobs</h3>
          <div className={styles.pollVsElection}>
            <p><strong>Poll</strong><span>Asks part of a group, then gives a clue.</span></p>
            <p><strong>Election</strong><span>Counts every ballot, then decides the result.</span></p>
          </div>

          <details className={styles.trustGuide}>
            <summary>Four smart questions to ask about any poll</summary>
            <dl>
              <div><dt>How many people answered?</dt><dd>Bigger random groups usually wobble less.</dd></div>
              <div><dt>Who was asked?</dt><dd>The group should include different kinds of people.</dd></div>
              <div><dt>When were they asked?</dt><dd>People can change their minds.</dd></div>
              <div><dt>Do other polls agree?</dt><dd>One poll is only one clue.</dd></div>
            </dl>
            <p>
              The 100 tree choices in this game are just for practice. Real pollsters work more carefully,
              but no poll can know for sure.
            </p>
          </details>
        </div>
      )}

      <p className={styles.pollBridge}>
        The poll was only a clue. <a href="#candidates">Your ballot is a real choice <ArrowIcon className={styles.arrowIcon} /></a>
      </p>
    </section>
  );
}

export function CandidateExplorer() {
  const [selectedId, setSelectedId] = useState(treeCandidates[0].id);
  const selectedIndex = treeCandidates.findIndex((candidate) => candidate.id === selectedId);
  const selected = treeCandidates[selectedIndex] ?? treeCandidates[0];

  return (
    <section className={styles.candidates} id="candidates" aria-labelledby="candidates-heading">
      <header className={styles.sectionLead}>
        <h2 id="candidates-heading">2. Meet the five tree candidates</h2>
        <p>
          Tap each tree to discover its superpower, how to spot it, and where it
          grows. Then choose your favourite when you vote.
        </p>
      </header>

      <div className={styles.candidateExplorer}>
        <div className={styles.explorerPrompt}>
          <strong>
            Tap a tree to meet it
            <small>Swipe to meet all five</small>
          </strong>
          <span aria-live="polite">Learning about {selected.name} · {selectedIndex + 1} of 5</span>
        </div>

        <div className={styles.candidateChoices} aria-label="Choose a tree to learn about">
          {treeCandidates.map((candidate) => (
            <button
              type="button"
              key={candidate.id}
              aria-pressed={selected.id === candidate.id}
              aria-label={`${candidate.name}: ${candidate.promise}`}
              onClick={(event) => {
                setSelectedId(candidate.id);
                event.currentTarget.scrollIntoView({
                  behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                    ? "auto"
                    : "smooth",
                  block: "nearest",
                  inline: "center",
                });
              }}
              style={candidateStyle(candidate)}
            >
              <span className={styles.choicePortrait} aria-hidden="true">
                <Image
                  src={candidate.image}
                  alt=""
                  width={candidate.imageWidth}
                  height={candidate.imageHeight}
                  sizes="86px"
                  loading="eager"
                />
              </span>
              <strong>{candidate.name}</strong>
            </button>
          ))}
        </div>

        <article className={styles.candidateProfile} style={candidateStyle(selected)}>
          <header className={styles.candidateIntro}>
            <h3>{selected.name}</h3>
            <div className={styles.candidatePromise}>
              <span>Tree superpower</span>
              <strong>{selected.promise}</strong>
            </div>
          </header>

          <div className={styles.candidatePortrait} key={selected.id}>
            <Image
              src={selected.image}
              alt={selected.imageAlt}
              width={selected.imageWidth}
              height={selected.imageHeight}
              sizes="(max-width: 680px) 48vw, 260px"
              loading="eager"
            />
          </div>

          <div className={styles.candidateDetails}>
            <dl>
              <div><dt>How to spot it</dt><dd>{selected.identify}</dd></div>
              <div><dt>Where it grows</dt><dd>{selected.habitat}</dd></div>
              <div><dt>How tall</dt><dd>{selected.height}</dd></div>
            </dl>
            <div className={styles.factList}>
              <h4>Three things to tell a friend</h4>
              <ul>{selected.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
            </div>
            <a href={selected.profile}>
              Open {selected.name}’s City fact sheet
              <ArrowIcon className={styles.arrowIcon} />
            </a>
          </div>
        </article>
      </div>
    </section>
  );
}
