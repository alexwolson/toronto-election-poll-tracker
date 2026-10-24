import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RacePage } from "@/components/results/race-page";
import { loadRaceSetups, racePageProps } from "@/lib/race-routes";

export const dynamicParams = false;

export async function generateStaticParams() {
  const { setups } = await loadRaceSetups();
  return setups.filter((s) => s.boardId === "tdsb").map((s) => ({ area: s.num }));
}

async function find(area: string) {
  const { setups, map } = await loadRaceSetups();
  const setup = setups.find((s) => s.id === `tdsb-${area}`);
  return setup ? racePageProps(setup, setups, map) : null;
}

export async function generateMetadata({ params }: { params: Promise<{ area: string }> }): Promise<Metadata> {
  const props = await find((await params).area);
  return props ? { title: `${props.setup.title} trustee results — Toronto Election` } : {};
}

export default async function TrusteeRacePage({ params }: { params: Promise<{ area: string }> }) {
  const props = await find((await params).area);
  if (!props) notFound();
  return <RacePage {...props} />;
}
