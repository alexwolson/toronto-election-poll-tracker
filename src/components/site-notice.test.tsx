import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SiteNotice } from "./site-notice";

describe("SiteNotice", () => {
  const html = renderToStaticMarkup(<SiteNotice />);

  it("is the design-system announcement banner", () => {
    expect(html).toContain('class="banner site-notice"');
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Announcement"');
  });

  it("carries the approved Alexander notice word for word", () => {
    expect(html.replace(/<[^>]+>/g, "")).toBe(
      "Chris Alexander ended his campaign on Oct. 6. This forecast uses polls taken while he was still campaigning. We are working to update our model.",
    );
  });

  it("has no link or dismiss button", () => {
    expect(html).not.toContain("<a");
    expect(html).not.toContain("<button");
  });
});
