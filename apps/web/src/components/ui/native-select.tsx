import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { controlClass } from "./input";

/** A styled native <select>: accessible, works everywhere, RTL-friendly. */
export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(controlClass, "cursor-pointer appearance-none ps-3 pe-9", className)} {...props} />
      <ChevronDown
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2"
      />
    </div>
  );
}
