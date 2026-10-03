import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** CHW's section and content measure, shared by analytical and directory pages. */
export function ContentSection({
  children,
  className,
  tint = false,
  kicker,
  ...props
}: ComponentProps<"section"> & { tint?: boolean; kicker?: ReactNode }) {
  return (
    <section className={cn("section", tint && "section--tint", className)} {...props}>
      <div className="wrap">
        {kicker && <p className="kicker">{kicker}</p>}
        {children}
      </div>
    </section>
  );
}
