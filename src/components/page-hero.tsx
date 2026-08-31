import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PageHeroProps {
  /** The id applied to the heading and referenced by the section label. */
  headingId: string;
  kicker?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * Editorial lead for a primary route. Keep supporting notes in `children` so
 * the title, description, and source metadata retain one predictable order.
 */
export function PageHero({
  headingId,
  kicker,
  title,
  description,
  meta,
  children,
  className,
}: PageHeroProps) {
  return (
    <section className={cn("race-hero", className)} aria-labelledby={headingId}>
      {kicker && <p className="np-kicker">{kicker}</p>}
      <h1 id={headingId}>{title}</h1>
      {description && <p className="race-hero-dek">{description}</p>}
      {meta && <p className="race-hero-meta font-mono">{meta}</p>}
      {children}
    </section>
  );
}
