import Link from "next/link";

export function PollingScopeNote() {
  return (
    <p className="polling-scope-note">
      This view follows the candidates included in the current forecast, not every
      candidate on Toronto&rsquo;s certified ballot. A candidate missing from a poll is
      not counted as 0%. <Link href="/candidates">See every candidate on the ballot.</Link>
    </p>
  );
}
