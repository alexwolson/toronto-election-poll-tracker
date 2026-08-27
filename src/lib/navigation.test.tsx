import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MastheadNav } from "@/components/masthead-nav";
import { MayorTabs } from "@/components/mayor-tabs";

const mocks = vi.hoisted(() => ({
  pathname: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: mocks.pathname,
}));

describe("site navigation", () => {
  beforeEach(() => {
    mocks.pathname.mockReturnValue("/");
  });

  it("uses Home for the forecast and Mayor for the mayoral section", () => {
    const html = renderToStaticMarkup(<MastheadNav />);

    expect(html).toContain(
      'class="font-mono nav-link nav-link--active" aria-current="page" href="/">Home</a>',
    );
    expect(html).toContain('class="font-mono nav-link" href="/candidates">Mayor</a>');
    expect(html).toContain(">Home</a>");
    expect(html).toContain(">Mayor</a>");
    expect(html).not.toContain(">Candidates</a>");
    expect(html).not.toContain('href="/polls"');
  });

  it("keeps Mayor active on the Polls page", () => {
    mocks.pathname.mockReturnValue("/polls");

    const html = renderToStaticMarkup(<MastheadNav />);

    expect(html).toContain(
      'class="font-mono nav-link nav-link--active" aria-current="page" href="/candidates">Mayor</a>',
    );
  });
});

describe("Mayor tabs", () => {
  it("links Candidates and Polls and marks the current page", () => {
    const candidates = renderToStaticMarkup(<MayorTabs activeTab="candidates" />);
    const polls = renderToStaticMarkup(<MayorTabs activeTab="polls" />);

    expect(candidates).toContain('aria-label="Mayor"');
    expect(candidates).toContain('href="/candidates"');
    expect(candidates).toContain('href="/polls"');
    expect(candidates).toContain('aria-current="page" href="/candidates">Candidates</a>');
    expect(polls).toContain('aria-current="page" href="/polls">Polls</a>');
  });
});
