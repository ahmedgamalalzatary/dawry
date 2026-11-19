"use client"

import { useTheme } from "@/lib/theme"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheck, Info, TriangleAlert, OctagonX, Loader2 } from "lucide-react"

/** Toasts as small ink slips with a coloured status edge. */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: <CircleCheck className="text-success size-5" />,
        info: <Info className="text-teal size-5" />,
        warning: <TriangleAlert className="text-chili size-5" />,
        error: <OctagonX className="text-destructive size-5" />,
        loading: <Loader2 className="size-5 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "calc(var(--radius) * 1.1)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "!gap-3 !py-3.5 !px-4 !text-sm !font-medium !shadow-[0_12px_30px_-12px_rgb(22_35_63/0.45)] !border-s-4",
          success: "!border-s-success",
          info: "!border-s-teal",
          warning: "!border-s-chili",
          error: "!border-s-destructive",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
