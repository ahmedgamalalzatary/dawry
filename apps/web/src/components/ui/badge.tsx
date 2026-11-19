import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/** A signal: a coloured dot plus a word. Colour is never the only carrier of meaning. */
const badgeVariants = cva(
  "inline-flex h-6 w-fit shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium whitespace-nowrap before:size-1.5 before:shrink-0 before:rounded-full before:bg-current",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground",
        preparing: "bg-preparing-soft text-preparing",
        out_for_delivery: "bg-transit-soft text-transit",
        delivered: "bg-go-soft text-go",
        cancelled: "bg-muted text-muted-foreground",
        late: "bg-late text-white before:bg-white dark:text-[#1a0b0a] dark:before:bg-[#1a0b0a]",
        active: "bg-go-soft text-go",
        inactive: "bg-late-soft text-late",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
)

function Badge({
  className,
  variant = "neutral",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">({ className: cn(badgeVariants({ variant }), className) }, props),
    render,
    state: { slot: "badge", variant },
  })
}

export { Badge, badgeVariants }
