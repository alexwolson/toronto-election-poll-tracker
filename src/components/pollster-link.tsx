import { pollsterWebsite } from "@/lib/polling";

export function PollsterLink({ firm }: { firm: string }) {
  const website = pollsterWebsite(firm);

  if (!website) return firm;

  return (
    <a
      className="pollster-link"
      href={website}
      target="_blank"
      rel="noreferrer"
      aria-label={`${firm} website (opens in a new tab)`}
    >
      {firm} <span aria-hidden="true">↗</span>
    </a>
  );
}
