"use client";

export function PollPeriodToggle({
  label,
  recent,
  onChange,
}: {
  label: string;
  recent: boolean;
  onChange: (recent: boolean) => void;
}) {
  return (
    <div className="evidence-lenses" role="group" aria-label={label}>
      <button type="button" aria-pressed={!recent} onClick={() => onChange(false)}>
        All polls
      </button>
      <button type="button" aria-pressed={recent} onClick={() => onChange(true)}>
        Since nominations closed
      </button>
    </div>
  );
}
