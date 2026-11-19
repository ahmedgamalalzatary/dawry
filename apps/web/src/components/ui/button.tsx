import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-150 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/60 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)] hover:bg-[color-mix(in_oklch,var(--primary),var(--background)_14%)]",
        brand:
          "bg-brand text-brand-foreground font-semibold shadow-[inset_0_-2px_0_rgb(0_0_0/0.14)] hover:bg-brand-strong",
        outline:
          "border-border bg-card text-foreground hover:border-[color-mix(in_oklch,var(--border),var(--foreground)_25%)] hover:bg-muted aria-expanded:bg-muted",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_8%)]",
        ghost: "text-foreground hover:bg-muted aria-expanded:bg-muted",
        destructive:
          "bg-destructive-soft text-destructive hover:bg-destructive hover:text-white focus-visible:ring-destructive/30",
        success: "bg-success text-white hover:bg-[color-mix(in_oklch,var(--success),black_12%)]",
        teal: "bg-teal text-white hover:bg-[color-mix(in_oklch,var(--teal),black_12%)] dark:text-[#0b1322]",
        link: "h-auto px-0 text-foreground underline decoration-brand decoration-2 underline-offset-4 hover:decoration-foreground",
      },
      size: {
        default: "h-10 px-4",
        xs: "h-7 gap-1 rounded-md px-2 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 gap-1.5 rounded-md px-3 text-[0.8125rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 rounded-xl px-6 text-base",
        icon: "size-10",
        "icon-xs": "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-8 rounded-md",
        "icon-lg": "size-12 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
