---
version: 1
slug: "route-kids-vote-weekend"
primary_target: "route:/kids-vote-weekend"
related_targets: ["src/app/kids-vote-weekend/page.tsx", "src/app/kids-vote-weekend/kids-vote-explorer.tsx", "src/app/kids-vote-weekend/kids-vote.module.css", "src/app/kids-vote-weekend/kids-vote-data.ts", "src/app/kids-vote-weekend/kids-vote-icons.tsx"]
---

## Scope

An unlinked, noindex learning route for roughly ages 7–11. Visitor mode: Read with a hands-on experiment.

## Job and action

Help a child discover that a poll asks some people to give a clue about a larger group, while an election counts cast ballots and decides a winner. The signature action is drawing random samples of 5, 20, or 50 from the same hidden group of 100, repeating the poll, then revealing all 100 answers.

## Content and proof

Use official City of Toronto Kids Vote Weekend facts, five official tree-candidate characters and profiles, voting instructions, dates, locations, and outward resources. Clearly label the simulated crowd and results as made up.

## Chosen direction

Civic activity booklet inside the established Toronto broadsheet world. Delight thesis: “the trees lead the lesson.” A concrete 5-versus-100 question and five-character gathering lead into three numbered bands: poll, trees, vote. Counts are primary; percentages are a quiet second layer. Seed key: `0cd2cc68`; chosen grounded form: 5 of 7. The sampler-sheet quality bar supports the progressive, learn-by-doing rhythm without changing the incumbent type system.

## Shipped expression

The first viewport names Kids Vote Weekend inside the heading, asks whether 5 kids can tell us what 100 kids think, and offers one blue “Try the poll game” action. All five official leaf characters gather on a blue activity field beside it, followed directly by a compact Poll / Trees / Vote trail. Eligibility, dates, and locations appear where they become useful in the voting walkthrough rather than as administrative hero blocks. The page is action-first: the poll remains the first substantial activity, and each numbered section heading states its complete question or task without depending on a kicker or nearby paragraph. Blue is the local teaching and action colour; the five leaf colours identify answers, sampled people, selection, and tree profiles. Directional links use one locally authored inline SVG arrow in right- and down-pointing variants, with brief hover motion and no icon-library dependency.

The route keeps the system's square controls, warm paper, serif/sans registers, ruled groupings, and no-shadow depth model, while reducing monospaced administrative language. It does not add a separate “kids font”: Newsreader carries story, questions, and outcomes at its actually loaded 600 and 700 weights, while Source Sans 3 carries instructions, controls, facts, and secondary data. The learning surface and its route-specific shell use only those two voices. The hero question is authored as three stable thought-groups—“Can 5 kids / tell us what / 100 kids think?”—rather than relying on accidental wrapping. Character art supplies the warmth. At narrow widths, the main navigation becomes one quiet row, the hero stacks while preserving its first action, the 100-choice grid precedes its result, the five-tree chooser becomes a snap-assisted strip, candidate copy precedes a smaller portrait, and the ballot path keeps a leaf guide at every stop. Visible kid-facing descriptors such as character captions and sample-size guidance stay in the 0.78–0.9rem mobile band; only terse tertiary helpers and evidence annotations may be smaller.

## Interaction contract

The poll uses one fixed practice group of 100 tree choices: its underlying 30 / 25 / 20 / 15 / 10 choice mix is grouped by tree from the beginning, so revealing the board creates visibly different-sized blocks without moving any sampled child. Every run samples truly random positions without replacement from all 100. Before predicting, the child must inspect at least three groups. A compact three-stop trail shows which groups have been asked and which comes next; nearby action labels count them through the sequence. The child may keep the same 5, 20, or 50-person sample size or switch sizes between any of those three runs without erasing the previous result or their progress. Sampled people reveal in their original grid cells as the official leaf character for their choice, on a pale candidate-tinted backing. Repeating the poll draws a new random group from the same 100 and shows one brief, state-aware comparison: “New group, same result” or “New group, new result.” Until the third group, the result panel holds the future prediction space with a concise count of the groups still needed. After the third, the child predicts which tree is winning in all 100 by tapping one of the existing sample-result rows. The pressed row and a short text confirmation hold the choice; the reveal stays disabled until a tree is picked. The prediction locks on first reveal, survives hiding and showing the full group, and resets with every new sample; additional samples remain available after the minimum three. The payoff simply places “You picked…” beside the full result and never grades the child as right or wrong. Revealing the full group turns every remaining question-mark spot into its leaf character in place, preserves blue rings around sampled positions, and explains that the largest character block is the most popular. The same official characters identify each row in both the sample and full-group result lists, replacing abstract initials while names and whole-child counts retain priority; percentages remain secondary.

The 100-choice grid must stay the largest object and must precede the result on mobile so children see cause before outcome: choose and ask, inspect the kids selected, then read their result and compare it with all 100. “Ask another group” and “Reveal all 100” remain separate actions. After one repeat, the reveal gains emphasis. The reveal control is a persistent two-way toggle whose label changes between reveal and hide while the same button retains focus; it owns `aria-controls` and an accurate `aria-expanded` state. A separate polite live region announces the current leader or tie, then announces the full-group leader and comparison on reveal. Result headings handle every valid outcome: one- and two-tree results keep the large side-by-side character treatment, while ties among three to five trees use a compact character row and count-based wording such as “All five trees are tied” instead of an overflowing name list. Poll and full-group result headings include their own context and outcome so they remain meaningful when scanned or announced independently. The compact, joined Poll / Election comparison states their different jobs in two parallel sentences and stays visible while the four deeper trust questions sit in a disclosure. The random-selection helper stays visible because equal chance is the experiment's core idea, but states it in child-sized language: “Everyone has the same chance to be picked.”

The “Meet the five tree candidates” explorer uses pressed-state buttons to select one of the five candidates, then shows that tree's official character, promise, identifying details, three facts, and City fact-sheet link. Selection motion is brief and functional, and all result-bar and portrait motion is removed when reduced motion is requested.

## Memorable moment

The child asks a subset of a 100-choice grid, watches the sampled dots become Toronto's five leaf characters, and then reveals all 100 to see how well the small group matched.

## Unresolved

None.
