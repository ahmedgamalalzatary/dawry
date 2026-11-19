"use client"

import * as React from "react"
import { cn } from "cn"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-1.5 text-[0.8125rem] leading-none font-medium text-foreground select-none",
        className
      )}
      {...props}
    />
  )
}

export { Label }
