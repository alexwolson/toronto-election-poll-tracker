import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** CHW's section and content measure, shared by analytical and directory pages. */
export function ContentSection({
  children,
  className,
  tint = false,
  ...props
}: ComponentProps<"section"> & { tint?: boolean }) {
  return (
    <section className={cn("section", tint && "section--tint", className)} {...props}>
      <div className="wrap">
        {children}
      </div>
    </section>
  );
}
