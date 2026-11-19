import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** A styled native <select>: accessible, works everywhere, RTL-friendly. */
export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs",
        "focus-visible:ring-ring/50 focus-visible:border-ring outline-none focus-visible:ring-[3px]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
