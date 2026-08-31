import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PollArchive } from "./poll-archive";
import type { Poll } from "@/types/feeds";

const POLL: Poll = {
  poll_id: "example-2026-08-21",
  firm: "Example Research",
  date_conducted: "2026-08-21",
  date_published: "2026-08-22",
  sample_size: 808,
  methodology: "IVR",
  field_tested: ["per_a4291ca7539b53e2acc1c4f108bc73e6"],
  shares: {
    per_a4291ca7539b53e2acc1c4f108bc73e6: 0.5,
    "response:other": 0.03,
  },
  notes: "",
};

describe("PollArchive", () => {
  it("labels every value for the mobile record layout", () => {
    const html = renderToStaticMarkup(
      <PollArchive
        polls={[POLL]}
        field={["per_a4291ca7539b53e2acc1c4f108bc73e6"]}
      />,
    );

    expect(html).toContain("Public mayoral polls, newest first");
    expect(html).toContain('data-label="Conducted"');
    expect(html).toContain('data-label="Pollster"');
    expect(html).toContain('data-label="Sample"');
    expect(html).toContain('data-label="Olivia Chow"');
    expect(html).toContain('data-label="Other reported choices"');
    expect(html).toContain('data-label="Survey method"');
    expect(html).toContain("3%");
    expect(html).toContain("Interactive voice response (IVR)");
  });
});
