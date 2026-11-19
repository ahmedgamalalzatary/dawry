import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** A styled native <select>: accessible, works everywhere, RTL-friendly. */
export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          "border-input bg-card h-10 w-full cursor-pointer appearance-none rounded-lg border ps-3 pe-9 text-sm transition-[border-color,box-shadow] outline-none",
          "hover:border-[color-mix(in_oklch,var(--input),var(--foreground)_25%)]",
          "focus-visible:border-brand-strong focus-visible:ring-brand/30 focus-visible:ring-3",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
      <ChevronDown
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2"
      />
    </div>
  );
}
