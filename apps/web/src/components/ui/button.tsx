import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-transparent text-sm font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow] duration-150 select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /* Ink: the one primary action on a screen. */
        default:
          "bg-primary text-primary-foreground hover:bg-[color-mix(in_oklab,var(--primary),var(--background)_16%)]",
        outline:
          "border-border-strong bg-surface text-foreground hover:bg-muted aria-expanded:bg-muted",
        secondary: "bg-muted text-foreground hover:bg-[color-mix(in_oklab,var(--muted),var(--foreground)_7%)]",
        ghost: "text-foreground hover:bg-muted aria-expanded:bg-muted",
        destructive:
          "border-border-strong bg-surface text-late hover:border-late/40 hover:bg-late-soft",
        "destructive-solid": "bg-late text-white hover:bg-[color-mix(in_oklab,var(--late),black_12%)] dark:text-[#1a0b0a]",
        /* Signal buttons move an order to its next state. */
        transit: "bg-transit text-white hover:bg-[color-mix(in_oklab,var(--transit),black_12%)] dark:text-[#160f2b]",
        go: "bg-go text-white hover:bg-[color-mix(in_oklab,var(--go),black_12%)] dark:text-[#04140e]",
        link: "h-auto border-0 px-0 text-link underline-offset-4 hover:underline",
        /* On the board (the dark shell). */
        board: "text-board-muted hover:bg-board-raised hover:text-board-foreground",
      },
      size: {
        default: "h-10 px-4",
        xs: "h-7 gap-1 rounded-md px-2 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 gap-1.5 rounded-md px-3 text-[0.8125rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 rounded-xl px-5 text-base",
        icon: "size-10",
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
