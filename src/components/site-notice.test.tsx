import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SiteNotice } from "./site-notice";

describe("SiteNotice", () => {
  it("is one short status line naming the Ipsos release", () => {
    const html = renderToStaticMarkup(<SiteNotice />);
    expect(html).toContain('class="site-notice"');
    expect(html).toContain('role="status"');
    expect(html).toContain("Ipsos poll released September 23");
    expect(html.replace(/<[^>]+>/g, "").length).toBeLessThan(120);
  });
});
