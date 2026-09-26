// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CandidateEndorsements, EndorsementsNote } from "./candidate-endorsements";

describe("CandidateEndorsements", () => {
  it("links each endorser to its source", () => {
    render(
      <CandidateEndorsements
        endorsements={[
          {
            endorser_id: "edr_pt",
            endorser_name: "Progress Toronto",
            endorser_type: "organization",
            kind: "progressive_champion",
            announced: null,
            date_precision: "unknown",
            source_url: "https://www.progresstoronto.ca/progressive-champions",
          },
        ]}
      />,
    );
    const link = screen.getByRole("link", { name: /Progress Toronto/ });
    expect(link.getAttribute("href")).toBe("https://www.progresstoronto.ca/progressive-champions");
  });

  it("says lists are partial", () => {
    render(<EndorsementsNote />);
    expect(screen.getByText(/may simply not be listed yet/)).toBeTruthy();
  });
});