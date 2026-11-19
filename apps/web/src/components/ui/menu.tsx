"use client"

import * as React from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { Check, ChevronLeft } from "lucide-react"
import { cn } from "cn"

/** A small action menu (the "more" button on a row). */
function Menu(props: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root {...props} />
}

function MenuTrigger(props: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger {...props} />
}

function MenuContent({
  className,
  align = "end",
  children,
  ...props
}: MenuPrimitive.Popup.Props & { align?: "start" | "center" | "end" }) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner align={align} sideOffset={6} className="z-50 outline-none">
        <MenuPrimitive.Popup
          className={cn(
            "bg-popover text-popover-foreground shadow-float min-w-48 origin-(--transform-origin) rounded-xl border p-1 text-sm outline-none transition-[opacity,transform] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
            className
          )}
          {...props}
        >
          {children}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

function MenuItem({
  className,
  tone = "default",
  ...props
}: MenuPrimitive.Item.Props & { tone?: "default" | "danger" }) {
  return (
    <MenuPrimitive.Item
      className={cn(
        "flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-muted [&_svg]:size-4 [&_svg]:shrink-0",
        tone === "danger" ? "text-late data-highlighted:bg-late-soft" : "[&_svg]:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function MenuSeparator({ className }: { className?: string }) {
  return <MenuPrimitive.Separator className={cn("bg-border -mx-1 my-1 h-px", className)} />
}

const ITEM =
  "flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-muted [&_svg]:size-4 [&_svg]:shrink-0"

/** A nested menu (one filter dimension inside the filter menu). */
function MenuSub(props: MenuPrimitive.SubmenuRoot.Props) {
  return <MenuPrimitive.SubmenuRoot {...props} />
}

/** The row that opens a nested menu; `hint` shows the current choice before the chevron. */
function MenuSubTrigger({
  className,
  children,
  hint,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props & { hint?: React.ReactNode }) {
  return (
    <MenuPrimitive.SubmenuTrigger
      openOnHover
      delay={60}
      className={cn(ITEM, "data-popup-open:bg-muted [&_svg]:text-muted-foreground", className)}
      {...props}
    >
      {children}
      {hint !== undefined ? (
        <span className="text-muted-foreground ms-auto max-w-36 truncate ps-4 text-xs">{hint}</span>
      ) : (
        <span className="ms-auto" />
      )}
      <ChevronLeft aria-hidden className="ltr:rotate-180" />
    </MenuPrimitive.SubmenuTrigger>
  )
}

function MenuSubContent({ className, children, ...props }: MenuPrimitive.Popup.Props) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner sideOffset={4} alignOffset={-4} className="z-50 outline-none">
        <MenuPrimitive.Popup
          className={cn(
            "bg-popover text-popover-foreground shadow-float max-h-(--available-height) min-w-44 origin-(--transform-origin) overflow-y-auto rounded-xl border p-1 text-sm outline-none transition-[opacity,transform] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
            className
          )}
          {...props}
        >
          {children}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

function MenuRadioGroup(props: MenuPrimitive.RadioGroup.Props) {
  return <MenuPrimitive.RadioGroup {...props} />
}

/** A single choice; the tick sits at the end like the ERP filter menus. */
function MenuRadioItem({ className, children, ...props }: MenuPrimitive.RadioItem.Props) {
  return (
    <MenuPrimitive.RadioItem
      className={cn(ITEM, "data-checked:text-foreground data-checked:font-medium", className)}
      {...props}
    >
      {children}
      <MenuPrimitive.RadioItemIndicator keepMounted className="ms-auto flex size-4 items-center justify-center data-unchecked:invisible">
        <Check className="size-4" />
      </MenuPrimitive.RadioItemIndicator>
    </MenuPrimitive.RadioItem>
  )
}

function MenuLabel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("text-muted-foreground px-2.5 pt-2 pb-1 text-xs font-medium", className)}>{children}</div>
}

export {
  Menu,
  MenuTrigger,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuSub,
  MenuSubTrigger,
  MenuSubContent,
  MenuRadioGroup,
  MenuRadioItem,
  MenuLabel,
}
