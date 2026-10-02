import Link from "next/link";

export function PollingScopeNote() {
  return (
    <p className="polling-scope-note">
      Shares are shown for the three forecast candidates, plus separately reported
      support for McVie and Parker. A candidate missing from a poll was not reported
      separately, not at 0%.{" "}
      <Link href="/candidates">See every candidate on the ballot.</Link>
    </p>
  );
}
