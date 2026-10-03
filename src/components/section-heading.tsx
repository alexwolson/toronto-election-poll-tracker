import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SectionHeadingProps {
  headingId: string;
  title: ReactNode;
  children?: ReactNode;
  className?: string;
}

/** Compact heading for a ruled editorial module inside a page. */
export function SectionHeading({
  headingId,
  title,
  children,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("simple-section-heading", className)}>
      <h2 id={headingId} className="section-title">
        {title}
      </h2>
      {children}
    </div>
  );
}
