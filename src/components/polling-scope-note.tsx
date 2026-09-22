import Link from "next/link";

export function PollingScopeNote() {
  return (
    <p className="polling-scope-note">
      Shares are shown for the candidates in the forecast. A candidate missing from a poll
      was not offered, not at 0%.{" "}
      <Link href="/candidates">See every candidate on the ballot.</Link>
    </p>
  );
}
