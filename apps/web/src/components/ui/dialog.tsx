"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"
import { XIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function Overlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-[#0c0b0a]/50 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0",
        className
      )}
      {...props}
    />
  )
}

function CloseX({ className }: { className?: string }) {
  const t = useTranslations("common")
  return (
    <DialogPrimitive.Close
      data-slot="dialog-close"
      render={<Button variant="ghost" size="icon-sm" className={cn("text-muted-foreground", className)} />}
    >
      <XIcon />
      <span className="sr-only">{t("close")}</span>
    </DialogPrimitive.Close>
  )
}

/** A centred dialog for short, focused tasks (a password, a QR code). */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & { showCloseButton?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <Overlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "bg-popover text-popover-foreground shadow-float fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-5 rounded-2xl border p-6 text-sm transition-[opacity,transform] duration-200 ease-(--ease-out-expo) outline-none data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:scale-[0.97] data-starting-style:opacity-0",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton ? <CloseX className="absolute top-4 end-4" /> : null}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

/**
 * A side panel that slides in from the inline end: forms that create something
 * (a new order, a staff member, a restaurant) without leaving the list behind.
 * On phones it fills the screen.
 */
function SheetContent({
  className,
  children,
  title,
  description,
  ...props
}: DialogPrimitive.Popup.Props & { title: React.ReactNode; description?: React.ReactNode }) {
  return (
    <DialogPrimitive.Portal>
      <Overlay />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "bg-surface text-foreground shadow-float fixed inset-y-0 end-0 z-50 flex w-full flex-col outline-none sm:max-w-lg sm:border-s",
          "transition-transform duration-300 ease-(--ease-out-expo) data-ending-style:translate-x-full data-starting-style:translate-x-full rtl:data-ending-style:-translate-x-full rtl:data-starting-style:-translate-x-full",
          className
        )}
        {...props}
      >
        <header className="flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-1">
            <DialogPrimitive.Title className="font-heading text-lg leading-tight font-semibold">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-muted-foreground text-sm">{description}</DialogPrimitive.Description>
            ) : null}
          </div>
          <CloseX className="-me-2" />
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("flex flex-col gap-1.5 pe-8", className)} {...props} />
}

/** The buttons at the bottom of a dialog: the main action on the end side. */
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-footer" className={cn("flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end", className)} {...props} />
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("font-heading text-lg leading-tight font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  SheetContent,
}
