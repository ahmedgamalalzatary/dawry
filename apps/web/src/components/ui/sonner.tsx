"use client"

import { useTheme } from "@/lib/theme"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheck, Info, TriangleAlert, OctagonX, Loader2 } from "lucide-react"

/** Toasts: a quiet slip with a signal-coloured icon. */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: <CircleCheck className="text-go size-5" />,
        info: <Info className="text-transit size-5" />,
        warning: <TriangleAlert className="text-late size-5" />,
        error: <OctagonX className="text-late size-5" />,
        loading: <Loader2 className="size-5 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "12px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "!gap-3 !py-3.5 !px-4 !text-sm !font-medium !shadow-float",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
