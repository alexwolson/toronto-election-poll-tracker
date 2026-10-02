import Link from "next/link";

export function PollingScopeNote() {
  return (
    <p className="polling-scope-note">
      Candidates appear only where a poll reported them.{" "}
      <Link href="/candidates">See every candidate on the ballot.</Link>
    </p>
  );
}
