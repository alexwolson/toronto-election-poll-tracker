import type { MethodologyFlowStep } from "@/lib/methodology";

export function MethodFlow({
  label,
  steps,
}: {
  label: string;
  steps: MethodologyFlowStep[];
}) {
  return (
    <figure className="method-flow" aria-label={label}>
      <ol>
        {steps.map((step, index) => (
          <li key={step.title}>
            <span className="method-flow__number" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <strong>{step.title}</strong>
              <p>{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </figure>
  );
}
