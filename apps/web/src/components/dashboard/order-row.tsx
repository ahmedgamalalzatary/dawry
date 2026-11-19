"use client";

import { canTransition, type EtaMode, type OrderStatus, type StaffOrder } from "@dawry/shared";
import { Bike, MoreHorizontal, PackageCheck, QrCode, Timer, XCircle } from "lucide-react";
import Link from "next/link";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import QRCode from "qrcode";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Flap } from "@/components/ui/flap";
import { Input } from "@/components/ui/input";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { api } from "@/lib/api/client";
import { formatCountdown, formatTime } from "@/lib/format";
import { orderPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

const MODES: EtaMode[] = ["countdown", "clock", "minutes"];

/** Desktop column template, shared with the board's header row. */
export const ROW_GRID =
  "md:grid-cols-[5rem_8.5rem_minmax(0,1fr)_8.5rem_auto] xl:grid-cols-[6rem_10rem_minmax(0,1fr)_minmax(0,11rem)_9.5rem_auto]";

/** One departure on the board: invoice, time, what, who, state, and the next action. The row opens the order. */
export function OrderRow({
  order,
  slug,
  now,
  onChange,
}: {
  order: StaffOrder;
  slug: string;
  now: Date;
  onChange: (order: StaffOrder) => void;
}) {
  const t = useTranslations("dashboard");
  const to = useTranslations("order");
  const locale = useLocale();
  const timeZone = useTimeZone();

  const preparing = order.status === "preparing";
  const finished = order.status === "delivered" || order.status === "cancelled";
  const msLeft = new Date(order.etaAt).getTime() - now.getTime();
  const clock = formatTime(order.etaAt, locale, timeZone);
  const lateMinutes = Math.max(1, Math.ceil(-msLeft / 60_000));

  const itemsLine = order.items.map((i) => `${i.quantity}× ${i.name}`).join("، ");
  const fieldsLine = order.fields.map((f) => `${f.label}: ${f.value}`).join(" · ");

  return (
    <li
      className={cn(
        "hover:bg-subtle relative grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-4 transition-colors sm:px-5",
        "md:gap-y-0 md:py-3.5",
        ROW_GRID,
        order.late && "bg-late-soft/50 hover:bg-late-soft/80",
        finished && "text-muted-foreground",
      )}
    >
      {/* Invoice: its link covers the whole row; the action cell sits above it. */}
      <Link
        href={`/dashboard/orders/${order.id}`}
        aria-label={t("invoiceLabel", { number: order.invoiceNumber })}
        className="row-link figure text-foreground text-xl font-semibold md:text-[1.375rem]"
        dir="ltr"
      >
        <span className="text-muted-foreground me-0.5 text-sm font-normal">#</span>
        {order.invoiceNumber}
      </Link>

      {/* Time */}
      <span className="col-start-3 row-start-1 flex flex-col items-end md:col-start-auto md:row-start-auto md:items-start">
        <Flap
          value={clock}
          className={cn(
            "text-lg leading-tight font-semibold",
            order.late ? "text-late" : finished ? "text-muted-foreground" : "text-foreground",
          )}
        />
        <span className={cn("text-xs", order.late ? "text-late font-medium" : "text-muted-foreground")}>
          {preparing ? (
            order.late ? (
              t("lateBy", { minutes: lateMinutes })
            ) : (
              <span className="figure" dir="ltr">
                {formatCountdown(msLeft)}
              </span>
            )
          ) : (
            to(`status.${order.status}`)
          )}
        </span>
      </span>

      {/* What */}
      <span className="col-span-3 row-start-3 flex min-w-0 flex-col gap-0.5 md:col-span-1 md:row-start-auto">
        <span className={cn("truncate text-sm", !finished && "text-foreground font-medium")} title={itemsLine}>
          {itemsLine}
        </span>
        {fieldsLine ? (
          <span className="text-muted-foreground truncate text-xs" title={fieldsLine}>
            {fieldsLine}
          </span>
        ) : null}
        {order.customerName ? (
          <span className="text-muted-foreground hidden truncate text-xs md:block xl:hidden">{order.customerName}</span>
        ) : null}
      </span>

      {/* Who */}
      <span
        className={cn(
          "text-muted-foreground col-span-3 row-start-4 min-w-0 truncate text-sm md:hidden xl:col-span-1 xl:row-start-auto xl:block",
          !order.customerName && !order.customerPhone && "max-md:hidden",
        )}
      >
        {order.customerName || order.customerPhone ? (
          <>
            {order.customerName}
            {order.customerName && order.customerPhone ? " · " : null}
            {order.customerPhone ? (
              <span className="figure" dir="ltr">
                {order.customerPhone}
              </span>
            ) : null}
          </>
        ) : (
          "—"
        )}
      </span>

      {/* State */}
      <span className="col-span-3 row-start-2 flex flex-wrap items-center gap-1.5 md:col-span-1 md:row-start-auto md:flex-col md:items-start">
        <span className="flex flex-wrap gap-1.5">
          <Badge variant={order.status}>{to(`status.${order.status}`)}</Badge>
          {order.late ? <Badge variant="late">{t("late")}</Badge> : null}
        </span>
        {preparing ? (
          <span className="text-muted-foreground text-xs">
            {order.ordersAhead === 0 ? (
              t("first")
            ) : (
              <>
                <Flap value={order.ordersAhead} className="text-foreground font-semibold" /> {t("aheadShort")}
              </>
            )}
          </span>
        ) : null}
      </span>

      {/* Next action */}
      <span className="relative z-10 col-span-3 row-start-5 flex items-center gap-2 pt-1 md:col-span-1 md:row-start-auto md:justify-end md:pt-0">
        <OrderActions order={order} slug={slug} onChange={onChange} />
      </span>
    </li>
  );
}

/**
 * The next step as one full button, everything else behind ⋯ (edit time, QR, cancel).
 * Used on the board rows and on the order page.
 */
export function OrderActions({
  order,
  slug,
  onChange,
  size = "row",
}: {
  order: StaffOrder;
  slug: string;
  onChange: (order: StaffOrder) => void;
  size?: "row" | "page";
}) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const [editing, setEditing] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const preparing = order.status === "preparing";

  async function run(request: Promise<StaffOrder>) {
    setPending(true);
    try {
      onChange(await request);
      return true;
    } catch {
      toast.error(tc("error"));
      return false;
    } finally {
      setPending(false);
    }
  }

  const changeStatus = (status: OrderStatus) =>
    run(api<StaffOrder>(`/api/restaurant/orders/${order.id}/status`, { method: "PATCH", body: { status } }));

  async function showQr() {
    setQr(
      await QRCode.toDataURL(`${window.location.origin}${orderPath(slug, order.invoiceNumber, order.businessDay)}`, {
        margin: 1,
        width: 320,
        color: { dark: "#1c1b19", light: "#ffffff" },
      }),
    );
  }

  const next = canTransition(order.status, "out_for_delivery")
    ? ({ to: "out_for_delivery", label: "markOut", icon: Bike, variant: "transit" } as const)
    : canTransition(order.status, "delivered")
      ? ({ to: "delivered", label: "markDelivered", icon: PackageCheck, variant: "go" } as const)
      : null;

  const width = size === "row" ? "flex-1 md:w-36 md:flex-none xl:w-40" : "flex-1 sm:min-w-44 sm:flex-none";

  return (
    <>
      {next ? (
        <Button
          variant={next.variant}
          size={size === "page" ? "lg" : "default"}
          className={width}
          disabled={pending}
          onClick={() => void changeStatus(next.to)}
        >
          <next.icon aria-hidden />
          {t(next.label)}
        </Button>
      ) : size === "row" ? (
        <span className={width} />
      ) : null}
      <Menu>
        <MenuTrigger
          render={
            <Button
              variant="outline"
              size={size === "page" ? "icon-lg" : "icon"}
              aria-label={t("moreFor", { number: order.invoiceNumber })}
              title={tc("actions")}
            />
          }
        >
          <MoreHorizontal />
        </MenuTrigger>
        <MenuContent>
          {preparing ? (
            <MenuItem onClick={() => setEditing(true)}>
              <Timer />
              {t("editEta")}
            </MenuItem>
          ) : null}
          <MenuItem onClick={() => void showQr()}>
            <QrCode />
            {t("qr")}
          </MenuItem>
          {canTransition(order.status, "cancelled") ? (
            <>
              <MenuSeparator />
              <MenuItem tone="danger" onClick={() => void changeStatus("cancelled")}>
                <XCircle />
                {t("cancelOrder")}
              </MenuItem>
            </>
          ) : null}
        </MenuContent>
      </Menu>

      <EtaDialog
        open={editing}
        onOpenChange={setEditing}
        order={order}
        pending={pending}
        onSave={async (eta) => {
          const ok = await run(
            api<StaffOrder>(`/api/restaurant/orders/${order.id}/eta`, { method: "PATCH", body: { eta } }),
          );
          if (ok) setEditing(false);
        }}
      />

      <Dialog open={qr !== null} onOpenChange={(open) => !open && setQr(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {t("qr")} <span dir="ltr">#{order.invoiceNumber}</span>
            </DialogTitle>
            <DialogDescription>{t("qrHint")}</DialogDescription>
          </DialogHeader>
          {qr ? (
            <div className="mx-auto rounded-xl border bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
              <img src={qr} alt={`QR #${order.invoiceNumber}`} className="size-64" />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function EtaDialog({
  open,
  onOpenChange,
  order,
  pending,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: StaffOrder;
  pending: boolean;
  onSave: (eta: { mode: EtaMode; time: string } | { mode: EtaMode; minutes: number }) => Promise<void>;
}) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const [mode, setMode] = useState<EtaMode>(order.etaMode);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void onSave(
      mode === "clock"
        ? { mode, time: String(form.get("time")) }
        : { mode, minutes: Number(form.get("minutes")) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("editEta")} <span dir="ltr">#{order.invoiceNumber}</span>
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <EtaModePicker value={mode} onChange={setMode} name={`eta-mode-${order.id}`} />
          {mode === "clock" ? (
            <Field id={`time-${order.id}`} label={t("time")}>
              <Input id={`time-${order.id}`} name="time" type="time" required dir="ltr" />
            </Field>
          ) : (
            <Field id={`min-${order.id}`} label={t("minutesFromNow")}>
              <Input id={`min-${order.id}`} name="minutes" type="number" min={1} max={600} required autoFocus />
            </Field>
          )}
          <Button type="submit" disabled={pending}>
            {tc("save")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** The three ETA modes as a segmented control (real radios underneath). */
export function EtaModePicker({
  value,
  onChange,
  name,
}: {
  value: EtaMode;
  onChange: (mode: EtaMode) => void;
  name: string;
}) {
  const t = useTranslations("dashboard");
  return (
    <div role="radiogroup" aria-label={t("eta")} className="bg-muted grid grid-cols-3 gap-1 rounded-lg p-1">
      {MODES.map((m) => (
        <label
          key={m}
          className={cn(
            "has-focus-visible:outline-ring flex h-9 cursor-pointer items-center justify-center rounded-md px-2 text-center text-[0.8125rem] font-medium transition-colors has-focus-visible:outline-2",
            value === m ? "bg-surface text-foreground shadow-raise" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <input
            type="radio"
            name={name}
            value={m}
            checked={value === m}
            onChange={() => onChange(m)}
            className="sr-only"
          />
          {t(`etaMode.${m}`)}
        </label>
      ))}
    </div>
  );
}
