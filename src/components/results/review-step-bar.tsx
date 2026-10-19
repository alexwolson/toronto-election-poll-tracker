"use client";

/** Review builds only (`review/count-steps`): a bar to move through the count's snapshots. */

import { useSyncExternalStore } from "react";
import { REVIEW, REVIEW_STEPS, reviewStep } from "@/lib/review-steps";

export function ReviewStepBar() {
  // The step is read from the URL once; choosing another reloads the page.
  const current = useSyncExternalStore(
    () => () => {},
    () => reviewStep(),
    () => null,
  );
  if (!REVIEW) return null;
  return (
    <nav
      aria-label="Review: point in the count"
      style={{
        position: "fixed",
        insetInline: 0,
        bottom: 0,
        zIndex: 50,
        display: "flex",
        flexWrap: "wrap",
        gap: "0.25rem",
        justifyContent: "center",
        padding: "0.5rem 1rem",
        background: "#1f2a44",
        color: "#fff",
        font: "500 0.8125rem/1.2 var(--font-mono, monospace)",
      }}
    >
      <span style={{ alignSelf: "center", marginInlineEnd: "0.5rem", opacity: 0.8 }}>Review · count:</span>
      {REVIEW_STEPS.map((step) => (
        <a
          key={step.id}
          href={`?step=${step.id}`}
          aria-current={current === step.id ? "step" : undefined}
          style={{
            padding: "0.375rem 0.625rem",
            borderRadius: "999px",
            color: current === step.id ? "#1f2a44" : "#fff",
            background: current === step.id ? "#fff" : "transparent",
            border: "1px solid rgba(255,255,255,0.5)",
            textDecoration: "none",
          }}
        >
          {step.label}
        </a>
      ))}
    </nav>
  );
}
