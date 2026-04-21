# Ward Narrative Lede Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an algorithmically generated editorial paragraph to each ward detail page that surfaces the 2–3 most notable signals for that ward in connected prose.

**Architecture:** A pure function `generateWardNarrative` in a new `ward-narrative.ts` lib file scores each signal, selects the top 2–3 by priority, and assembles them into a paragraph using pre-written phrase chunks and risk-direction-aware connectives. The ward detail page calls this function and conditionally renders a serif `<p>` between the header and the vulnerability section.

**Tech Stack:** TypeScript, Next.js 16, Vitest (new)

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `frontend/vitest.config.ts` | Vitest config with `@/*` path alias |
| Modify | `frontend/package.json` | Add vitest dev dependency + `test` script |
| Create | `frontend/src/lib/ward-narrative.ts` | Signal scoring + sentence assembly + `generateWardNarrative` |
| Create | `frontend/src/lib/ward-narrative.test.ts` | Unit tests for the narrative function |
| Modify | `frontend/src/app/wards/[ward_num]/page.tsx` | Render the narrative lede paragraph |

---

### Task 1: Set up Vitest for frontend unit tests

**Files:**
- Create: `frontend/vitest.config.ts`
- Modify: `frontend/package.json`

- [ ] **Step 1: Install vitest**

From the `frontend/` directory:

```bash
cd frontend && npm install --save-dev vitest
```

- [ ] **Step 2: Create vitest config**

Create `frontend/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 3: Add test script to package.json**

In `frontend/package.json`, add `"test": "vitest run"` to the `"scripts"` block:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run"
},
```

- [ ] **Step 4: Verify vitest is working**

```bash
cd frontend && npx vitest run --reporter=verbose 2>&1 | head -20
```

Expected: "No test files found" or similar — no errors about config.

- [ ] **Step 5: Commit**

```bash
git add frontend/vitest.config.ts frontend/package.json frontend/package-lock.json
git commit -m "chore: add vitest for frontend unit tests"
```

---

### Task 2: Implement `ward-narrative.ts` with TDD

**Files:**
- Create: `frontend/src/lib/ward-narrative.ts`
- Create: `frontend/src/lib/ward-narrative.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/lib/ward-narrative.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { generateWardNarrative } from "./ward-narrative";
import type { Ward, Challenger } from "@/types/ward";

function makeWard(overrides: Partial<Ward> = {}): Ward {
  return {
    ward: 1,
    councillor_name: "Test Councillor",
    is_running: true,
    is_byelection_incumbent: false,
    defeatability_score: 40,
    win_probability: 0.6,
    race_class: "competitive",
    factors: { vuln: 0, coat: 0, chal: 0 },
    coattail_detail: { alignment: 0.5, alignment_delta: 0, ward_lean: 0 },
    vote_share: 0.55,       // flat — unremarkable
    electorate_share: 0.14, // flat — unremarkable
    pop_growth_pct: 0.01,   // flat — unremarkable
    ...overrides,
  };
}

function makeChallenger(overrides: Partial<Challenger> = {}): Challenger {
  return {
    ward: 1,
    candidate_name: "Generic Challenger",
    name_recognition_tier: "unknown",
    fundraising_tier: null,
    mayoral_alignment: "aligned",
    is_endorsed_by_departing: false,
    ...overrides,
  };
}

describe("generateWardNarrative", () => {
  it("returns null when councillor is not running", () => {
    const ward = makeWard({ is_running: false });
    expect(generateWardNarrative(ward, [])).toBeNull();
  });

  it("returns null when fewer than 2 signals are notable", () => {
    // All flat signals, no challengers registered (Generic Challenger only)
    const ward = makeWard();
    const challengers = [makeChallenger()]; // Generic Challenger — not notable
    expect(generateWardNarrative(ward, challengers)).toBeNull();
  });

  it("joins two risk-raising signals with 'On top of that,'", () => {
    // Low vote share (raises) + well-known challenger (raises)
    const ward = makeWard({ vote_share: 0.38 });
    const challengers = [
      makeChallenger({ candidate_name: "Jane Smith", name_recognition_tier: "well-known" }),
    ];
    const result = generateWardNarrative(ward, challengers);
    expect(result).not.toBeNull();
    expect(result).toContain("On top of that,");
  });

  it("joins two risk-reducing signals with 'Adding to this,'", () => {
    // Strong vote share (reduces) + zero named challengers (reduces)
    const ward = makeWard({ vote_share: 0.68 });
    const challengers: Challenger[] = []; // zero challengers
    const result = generateWardNarrative(ward, challengers);
    expect(result).not.toBeNull();
    expect(result).toContain("Adding to this,");
  });

  it("joins risk-reducing then risk-raising with 'However,'", () => {
    // Strong vote share (reduces) + low electorate share (raises)
    const ward = makeWard({ vote_share: 0.68, electorate_share: 0.08 });
    const challengers = [makeChallenger()]; // Generic — not notable
    const result = generateWardNarrative(ward, challengers);
    expect(result).not.toBeNull();
    expect(result).toContain("However,");
  });

  it("joins risk-raising then risk-reducing with 'That said,'", () => {
    // Low vote share (raises) + broad electorate share (reduces)
    const ward = makeWard({ vote_share: 0.38, electorate_share: 0.22 });
    const challengers = [makeChallenger()]; // Generic — not notable
    const result = generateWardNarrative(ward, challengers);
    expect(result).not.toBeNull();
    expect(result).toContain("That said,");
  });

  it("caps output at 3 signals", () => {
    // Well-known challenger + low vote share + low electorate share + pop growth (4 notables)
    const ward = makeWard({ vote_share: 0.38, electorate_share: 0.08, pop_growth_pct: 0.05 });
    const challengers = [
      makeChallenger({ candidate_name: "Jane Smith", name_recognition_tier: "well-known" }),
    ];
    const result = generateWardNarrative(ward, challengers);
    expect(result).not.toBeNull();
    // Should not contain population growth sentence (4th signal, below cap)
    expect(result).not.toContain("grown rapidly");
  });

  describe("signal sentences", () => {
    it("names the councillor in the low vote share sentence", () => {
      const ward = makeWard({ vote_share: 0.38, electorate_share: 0.08 });
      const result = generateWardNarrative(ward, []);
      expect(result).toContain("Test Councillor");
      expect(result).toContain("thin margin");
    });

    it("uses the strong vote share sentence when vote_share > 0.62", () => {
      const ward = makeWard({ vote_share: 0.70, electorate_share: 0.22 });
      const result = generateWardNarrative(ward, []);
      expect(result).toContain("wide cushion");
    });

    it("names a well-known challenger in the challenger sentence", () => {
      const ward = makeWard({ vote_share: 0.38 });
      const challengers = [
        makeChallenger({ candidate_name: "Jane Smith", name_recognition_tier: "well-known" }),
      ];
      const result = generateWardNarrative(ward, challengers);
      expect(result).toContain("Jane Smith");
    });

    it("uses zero-challengers sentence when no named challengers registered", () => {
      // Only a Generic Challenger in the list
      const ward = makeWard({ vote_share: 0.38 });
      const challengers = [makeChallenger()]; // Generic Challenger
      const result = generateWardNarrative(ward, challengers);
      expect(result).toContain("No challengers have registered yet");
    });

    it("high alignment + positive lean → reinforcing sentence", () => {
      const ward = makeWard({
        vote_share: 0.38,
        coattail_detail: { alignment: 0.82, alignment_delta: 0.1, ward_lean: 0.06 },
      });
      const result = generateWardNarrative(ward, []);
      expect(result).toContain("vote closely with Mayor Chow");
      expect(result).toContain("leaned toward Chow");
    });

    it("high alignment + negative lean → misalignment sentence", () => {
      const ward = makeWard({
        vote_share: 0.38,
        coattail_detail: { alignment: 0.82, alignment_delta: 0.1, ward_lean: -0.06 },
      });
      const result = generateWardNarrative(ward, []);
      expect(result).toContain("vote closely with Mayor Chow");
      expect(result).toContain("cool toward Chow");
    });

    it("low alignment + positive lean → distance sentence", () => {
      const ward = makeWard({
        vote_share: 0.38,
        coattail_detail: { alignment: 0.3, alignment_delta: -0.1, ward_lean: 0.06 },
      });
      const result = generateWardNarrative(ward, []);
      expect(result).toContain("kept distance from Mayor Chow");
      expect(result).toContain("leaned toward Chow");
    });

    it("low alignment + negative lean → aligned-against sentence", () => {
      const ward = makeWard({
        vote_share: 0.38,
        coattail_detail: { alignment: 0.3, alignment_delta: -0.1, ward_lean: -0.06 },
      });
      const result = generateWardNarrative(ward, []);
      expect(result).toContain("kept distance from Mayor Chow");
      expect(result).toContain("cool reception");
    });

    it("thin electorate share sentence appears", () => {
      const ward = makeWard({ vote_share: 0.38, electorate_share: 0.08 });
      const result = generateWardNarrative(ward, []);
      expect(result).toContain("voter-drive");
    });

    it("broad electorate share sentence appears", () => {
      const ward = makeWard({ vote_share: 0.38, electorate_share: 0.22 });
      const result = generateWardNarrative(ward, []);
      expect(result).toContain("penetrates broadly");
    });

    it("high pop growth sentence appears when it reaches a signal slot", () => {
      // Zero challengers(1) + low vote share(2) + pop growth(3) — coattail and electorate are flat
      const ward = makeWard({ vote_share: 0.38, pop_growth_pct: 0.05 });
      const result = generateWardNarrative(ward, []);
      expect(result).toContain("grown rapidly");
    });

    it("stable pop growth sentence appears", () => {
      const ward = makeWard({ vote_share: 0.38, pop_growth_pct: -0.02 });
      const result = generateWardNarrative(ward, []);
      expect(result).toContain("stable or shrinking");
    });
  });

  it("returns null when coattail_detail is absent and fewer than 2 other signals are notable", () => {
    const ward = makeWard({ coattail_detail: undefined, vote_share: 0.38 });
    const challengers = [makeChallenger()]; // Generic only
    expect(generateWardNarrative(ward, challengers)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm they all fail**

```bash
cd frontend && npx vitest run src/lib/ward-narrative.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: all tests fail with "Cannot find module './ward-narrative'".

- [ ] **Step 3: Implement `ward-narrative.ts`**

Create `frontend/src/lib/ward-narrative.ts`:

```ts
import type { Ward, Challenger } from "@/types/ward";

interface NarrativeSignal {
  sentence: string;
  riskDirection: "raises" | "reduces";
}

function scoreChallenger(challengers: Challenger[], councillorName: string): NarrativeSignal | null {
  const named = challengers.filter((c) => c.candidate_name !== "Generic Challenger");
  const wellKnown = named.filter((c) => c.name_recognition_tier === "well-known");

  if (wellKnown.length > 0) {
    const names = wellKnown.map((c) => c.candidate_name);
    const nameStr =
      names.length === 1
        ? names[0]
        : names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
    return {
      sentence: `${nameStr} has entered the race as a well-known challenger, adding meaningful pressure on ${councillorName}.`,
      riskDirection: "raises",
    };
  }

  if (named.length === 0) {
    return {
      sentence: "No challengers have registered yet, which keeps race pressure low for now.",
      riskDirection: "reduces",
    };
  }

  return null;
}

function scoreVoteShare(ward: Ward): NarrativeSignal | null {
  const vote = ward.vote_share;
  if (vote === undefined) return null;
  if (vote < 0.45) {
    return {
      sentence: `${ward.councillor_name}'s 2022 vote share was low — they won with a thin margin that leaves little buffer against a credible challenger.`,
      riskDirection: "raises",
    };
  }
  if (vote > 0.62) {
    return {
      sentence: `${ward.councillor_name}'s 2022 vote share was strong, giving them a wide cushion against most challengers.`,
      riskDirection: "reduces",
    };
  }
  return null;
}

function scoreCoattail(ward: Ward): NarrativeSignal | null {
  if (!ward.coattail_detail) return null;
  const { alignment, ward_lean } = ward.coattail_detail;

  const highAlignment = alignment > 0.7;
  const lowAlignment = alignment < 0.4;
  const positiveLean = ward_lean > 0.03;
  const negativeLean = ward_lean < -0.03;

  if (!highAlignment && !lowAlignment) return null;
  if (!positiveLean && !negativeLean) return null;

  if (highAlignment && positiveLean) {
    return {
      sentence:
        "They vote closely with Mayor Chow, and this ward has historically leaned toward Chow's coalition — a combination that could reinforce their support.",
      riskDirection: "reduces",
    };
  }
  if (highAlignment && negativeLean) {
    return {
      sentence:
        "They vote closely with Mayor Chow, but this ward has historically been cool toward Chow's coalition — an alignment that may not play to their advantage.",
      riskDirection: "raises",
    };
  }
  if (lowAlignment && positiveLean) {
    return {
      sentence:
        "They have kept distance from Mayor Chow's voting record, even though this ward has historically leaned toward Chow's coalition.",
      riskDirection: "raises",
    };
  }
  // lowAlignment && negativeLean
  return {
    sentence:
      "They have kept distance from Mayor Chow's voting record, which aligns with this ward's historically cool reception of Chow's coalition.",
    riskDirection: "reduces",
  };
}

function scoreElectorateShare(ward: Ward): NarrativeSignal | null {
  const e = ward.electorate_share;
  if (e === undefined) return null;
  if (e < 0.11) {
    return {
      sentence:
        "Their base is thin relative to the registered electorate — a challenger running a strong voter-drive could activate enough new voters to tip the result.",
      riskDirection: "raises",
    };
  }
  if (e > 0.18) {
    return {
      sentence:
        "Their vote penetrates broadly into the registered electorate, making it harder for a challenger to close the gap through voter mobilisation alone.",
      riskDirection: "reduces",
    };
  }
  return null;
}

function scorePopGrowth(ward: Ward): NarrativeSignal | null {
  const g = ward.pop_growth_pct;
  if (g === undefined) return null;
  if (g > 0.03) {
    return {
      sentence:
        "The ward has grown rapidly since 2021, adding a large pool of new residents the councillor has never won.",
      riskDirection: "raises",
    };
  }
  if (g < -0.01) {
    return {
      sentence:
        "A stable or shrinking voter base reduces the new-voter volatility that challengers typically exploit.",
      riskDirection: "reduces",
    };
  }
  return null;
}

function pickConnective(prev: NarrativeSignal, next: NarrativeSignal): string {
  if (prev.riskDirection === next.riskDirection) {
    return prev.riskDirection === "raises" ? "On top of that, " : "Adding to this, ";
  }
  return next.riskDirection === "raises" ? "However, " : "That said, ";
}

export function generateWardNarrative(ward: Ward, challengers: Challenger[]): string | null {
  if (!ward.is_running) return null;

  const scoreFns = [
    () => scoreChallenger(challengers, ward.councillor_name),
    () => scoreVoteShare(ward),
    () => scoreCoattail(ward),
    () => scoreElectorateShare(ward),
    () => scorePopGrowth(ward),
  ];

  const notable: NarrativeSignal[] = [];
  for (const fn of scoreFns) {
    if (notable.length >= 3) break;
    const result = fn();
    if (result) notable.push(result);
  }

  if (notable.length < 2) return null;

  const sentences: string[] = [notable[0].sentence];
  for (let i = 1; i < notable.length; i++) {
    const connective = pickConnective(notable[i - 1], notable[i]);
    const raw = notable[i].sentence;
    sentences.push(connective + raw.charAt(0).toLowerCase() + raw.slice(1));
  }

  return sentences.join(" ");
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
cd frontend && npx vitest run src/lib/ward-narrative.test.ts --reporter=verbose 2>&1 | tail -30
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/ward-narrative.ts frontend/src/lib/ward-narrative.test.ts
git commit -m "feat: add generateWardNarrative function with signal scoring and sentence assembly"
```

---

### Task 3: Render the narrative lede on the ward detail page

**Files:**
- Modify: `frontend/src/app/wards/[ward_num]/page.tsx`

- [ ] **Step 1: Import `generateWardNarrative` and add the lede**

In `frontend/src/app/wards/[ward_num]/page.tsx`:

Add import at the top alongside the other lib imports:

```ts
import { generateWardNarrative } from "@/lib/ward-narrative";
```

After the `displayName` / `wardLabel` lines (around line 72), add:

```ts
const narrativeLede = generateWardNarrative(ward, challengers);
```

Then, in the JSX, insert the lede paragraph between the `<hr className="np-rule" />` and the vulnerability `<div>`. The current structure is:

```tsx
<hr className="np-rule" />

{/* Vulnerability */}
<div
  style={{
    border: "1px solid #ccc",
```

Replace that block opener with:

```tsx
<hr className="np-rule" />

{narrativeLede && (
  <p
    style={{
      ...SERIF,
      fontSize: "0.92rem",
      lineHeight: 1.6,
      color: "#1a1a1a",
      margin: "1.25rem 0 1.5rem 0",
    }}
  >
    {narrativeLede}
  </p>
)}

{/* Vulnerability */}
<div
  style={{
    border: "1px solid #ccc",
```

- [ ] **Step 2: Verify the page builds without TypeScript errors**

```bash
cd frontend && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 3: Start the dev server and manually verify**

```bash
cd frontend && npm run dev
```

Open a ward page with a running councillor, e.g. `http://localhost:3000/wards/1`. Confirm:
- A serif paragraph appears below the horizontal rule, above the vulnerability pill
- The paragraph reads naturally (check a couple of wards with different signal profiles)
- No lede appears on an open seat ward (where `is_running` is false)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/wards/[ward_num]/page.tsx
git commit -m "feat: render ward narrative lede on ward detail page"
```
