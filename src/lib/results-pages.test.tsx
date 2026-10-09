import { isValidElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import councilFixture from "../../fixtures/council_race_cards.json";
import trusteeFixture from "../../fixtures/trustee_race_cards.json";
import ResultsPage from "@/app/results/page";
import WardResultsPage, {
  dynamicParams,
  generateMetadata,
  generateStaticParams,
} from "@/app/results/[ward]/page";
import type { CouncilRaceCardsFeed, TrusteeRaceCardsFeed } from "@/types/feeds";

const mocks = vi.hoisted(() => ({
  loadCouncilRaceCards: vi.fn(),
  loadTrusteeRaceCards: vi.fn(),
}));

vi.mock("@/lib/feeds", () => ({
  loadCouncilRaceCards: mocks.loadCouncilRaceCards,
  loadTrusteeRaceCards: mocks.loadTrusteeRaceCards,
}));

beforeEach(() => {
  mocks.loadCouncilRaceCards.mockResolvedValue(councilFixture as unknown as CouncilRaceCardsFeed);
  mocks.loadTrusteeRaceCards.mockResolvedValue(trusteeFixture as unknown as TrusteeRaceCardsFeed);
});

const params = (ward: string) => ({ params: Promise.resolve({ ward }) });
const NOT_FOUND = { digest: "NEXT_HTTP_ERROR_FALLBACK;404" };

describe("Ward Ballot routes (#17 § Results pages, #13)", () => {
  it("statically generates /results/1/ to /results/25/ and nothing on demand", () => {
    expect(generateStaticParams()).toEqual(Array.from({ length: 25 }, (_, i) => ({ ward: String(i + 1) })));
    expect(dynamicParams).toBe(false);
  });

  it("returns 404 for /results/26/ and other unknown wards", async () => {
    for (const ward of ["26", "0", "01", "mayor"]) {
      await expect(WardResultsPage(params(ward)), ward).rejects.toMatchObject(NOT_FOUND);
      await expect(generateMetadata(params(ward)), ward).rejects.toMatchObject(NOT_FOUND);
    }
  });

  it("gives each ward page its own static title and description", async () => {
    const metadata = await generateMetadata(params("14"));
    expect(metadata.title).toBe("Ward 14 Toronto-Danforth: election night results");
    expect(metadata.description).toContain("Ward 14 Toronto-Danforth");
    // The site's usual share image: inherited, never overridden per page.
    expect(metadata.openGraph).toBeUndefined();
    expect((await generateMetadata(params("3"))).title).toBe(
      "Ward 3 Etobicoke-Lakeshore: election night results",
    );
  });

  it("builds a ward's ballot from the trustee feed and every ward's picker label", async () => {
    const page = await WardResultsPage(params("14"));
    expect(isValidElement(page)).toBe(true);
    const props = (page as { props: { ballot: string[]; ward: { num: string; name: string }; wards: unknown[] } })
      .props;
    expect(props.ward).toEqual({ num: "14", name: "Toronto-Danforth" });
    expect(props.ballot).toEqual(["councillor-14", "tdsb-5", "tcdsb-11", "viamonde-3", "monavenir-4"]);
    expect(props.wards).toHaveLength(25);
  });

  it("starts /results/ with no ward and no ballot", async () => {
    const props = ((await ResultsPage()) as { props: { ballot: string[]; ward: unknown } }).props;
    expect(props.ward).toBeNull();
    expect(props.ballot).toEqual([]);
  });
});
