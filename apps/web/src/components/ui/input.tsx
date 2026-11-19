import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-lg border border-input bg-card px-3 py-1 text-base transition-[border-color,box-shadow] outline-none placeholder:text-muted-foreground/80 hover:border-[color-mix(in_oklch,var(--input),var(--foreground)_25%)] focus-visible:border-brand-strong focus-visible:ring-3 focus-visible:ring-brand/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm [&[type=number]]:tabular-nums",
        className
      )}
      {...props}
    />
  )
}

export { Input }
