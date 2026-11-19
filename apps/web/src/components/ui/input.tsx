import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

/** The shared look of every text control. */
export const controlClass =
  "h-10 w-full min-w-0 rounded-lg border border-input bg-surface px-3 text-base text-foreground transition-[border-color,box-shadow] outline-none placeholder:text-muted-foreground/70 hover:border-border-strong focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-late aria-invalid:ring-3 aria-invalid:ring-late/15 md:text-sm"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(controlClass, "[&[type=number]]:figure", className)}
      {...props}
    />
  )
}

export { Input }
