import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A board figure that flips in like a split-flap tile: once when it first
 * appears and again whenever its value changes (the span is re-keyed by value).
 */
export function Flap({
  value,
  children,
  className,
  dir,
}: {
  value: string | number;
  children?: ReactNode;
  className?: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <span key={String(value)} className={cn("flap figure", className)} dir={dir}>
      {children ?? value}
    </span>
  );
}
