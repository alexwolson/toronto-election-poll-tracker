import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RacePage } from "@/components/results/race-page";
import { councilSlug, loadRaceSetups, racePageProps } from "@/lib/race-routes";

/** Only the 25 wards' slugs: any other root path 404s rather than render on demand. */
export const dynamicParams = false;

export async function generateStaticParams() {
  const { setups } = await loadRaceSetups();
  return setups.filter((s) => s.kind === "council").map((s) => ({ ward: councilSlug(s) }));
}

async function find(slug: string) {
  const { setups, map } = await loadRaceSetups();
  const setup = setups.find((s) => s.kind === "council" && councilSlug(s) === slug);
  return setup ? racePageProps(setup, setups, map) : null;
}

export async function generateMetadata({ params }: { params: Promise<{ ward: string }> }): Promise<Metadata> {
  const props = await find((await params).ward);
  return props ? { title: `${props.setup.title} (Ward ${props.setup.num}) results — Toronto Election`, description: `The City of Toronto's unofficial count for councillor in Ward ${props.setup.num} ${props.setup.title}, Oct. 26, 2026.` } : {};
}

export default async function CouncilRacePage({ params }: { params: Promise<{ ward: string }> }) {
  const props = await find((await params).ward);
  if (!props) notFound();
  return <RacePage {...props} />;
}
