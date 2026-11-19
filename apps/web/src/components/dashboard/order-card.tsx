"use client";

import { canTransition, type EtaMode, type OrderStatus, type StaffOrder } from "@dawry/shared";
import { Bike, Clock, PackageCheck, QrCode, Timer, UserRound, UsersRound, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import QRCode from "qrcode";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { api } from "@/lib/api/client";
import { etaDisplay, formatTime } from "@/lib/format";
import { orderPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

/** The coloured edge of a ticket says its state at a glance from across the counter. */
const EDGE: Record<OrderStatus, string> = {
  preparing: "border-t-brand",
  out_for_delivery: "border-t-teal",
  delivered: "border-t-success",
  cancelled: "border-t-border",
};

export function OrderCard({
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
  const tc = useTranslations("common");
  const locale = useLocale();
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<EtaMode>(order.etaMode);
  const [qr, setQr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const eta = etaDisplay(order.etaMode, order.etaAt, now);
  const finished = order.status === "delivered" || order.status === "cancelled";

  async function run(request: Promise<StaffOrder>) {
    setPending(true);
    try {
      onChange(await request);
    } catch {
      toast.error(tc("error"));
    } finally {
      setPending(false);
    }
  }

  function changeStatus(status: OrderStatus) {
    void run(
      api<StaffOrder>(`/api/restaurant/orders/${order.id}/status`, {
        method: "PATCH",
        body: { status },
      }),
    );
  }

  async function saveEta(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(
      api<StaffOrder>(`/api/restaurant/orders/${order.id}/eta`, {
        method: "PATCH",
        body: {
          eta:
            mode === "clock"
              ? { mode, time: String(form.get("time")) }
              : { mode, minutes: Number(form.get("minutes")) },
        },
      }),
    );
    setEditing(false);
  }

  async function showQr() {
    setQr(
      await QRCode.toDataURL(`${window.location.origin}${orderPath(slug, order.invoiceNumber)}`, {
        margin: 1,
        width: 320,
        color: { dark: "#16233f", light: "#ffffff" },
      }),
    );
  }

  const next: { to: OrderStatus; label: "markOut" | "markDelivered"; icon: typeof Bike; variant: "teal" | "success" } | null =
    canTransition(order.status, "out_for_delivery")
      ? { to: "out_for_delivery", label: "markOut", icon: Bike, variant: "teal" }
      : canTransition(order.status, "delivered")
        ? { to: "delivered", label: "markDelivered", icon: PackageCheck, variant: "success" }
        : null;

  return (
    <li className={cn("ticket-shadow", finished && "opacity-75 transition-opacity hover:opacity-100")}>
      {/* Top half: who and when */}
      <div
        className={cn(
          "ticket-top bg-card rounded-t-2xl border-t-[5px] px-4 pt-3 pb-4",
          order.late ? "border-t-chili" : EDGE[order.status],
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-3xl leading-none font-bold tracking-tight tabular-nums" dir="ltr">
            #{order.invoiceNumber}
          </span>
          <div className="flex flex-wrap justify-end gap-1">
            {order.late ? <Badge variant="late">{t("late")}</Badge> : null}
            <Badge variant={order.status}>{to(`status.${order.status}`)}</Badge>
          </div>
        </div>

        {order.customerName ? (
          <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-sm">
            <UserRound aria-hidden className="size-3.5" />
            {order.customerName}
          </p>
        ) : null}

        {order.status === "preparing" ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span
              className={cn(
                "flex items-center gap-1.5 text-lg font-semibold tabular-nums",
                order.late && "text-chili",
              )}
            >
              <Clock aria-hidden className="size-4" />
              {order.late || eta.kind === "clock"
                ? to("eta.at", { time: formatTime(order.etaAt, locale) })
                : eta.kind === "countdown"
                  ? to("eta.countdown", { remaining: eta.remaining })
                  : to("eta.minutes", { minutes: eta.minutes })}
            </span>
            <span className="bg-secondary text-secondary-foreground flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums">
              <UsersRound aria-hidden className="size-3.5" />
              {t("ahead", { count: order.ordersAhead })}
            </span>
          </div>
        ) : null}
      </div>

      {/* Bottom half: what and what next */}
      <div className="ticket-bottom bg-card flex flex-col gap-3 rounded-b-2xl px-4 pb-4">
        <div className="perforation text-foreground mx-1 mb-1" />

        <ul className="flex flex-col gap-1.5 text-sm">
          {order.items.map((item, i) => (
            <li key={i} className="flex items-center gap-2.5">
              <span className="bg-secondary flex h-6 min-w-6 items-center justify-center rounded-md px-1 text-xs font-bold tabular-nums">
                {item.quantity}
              </span>
              <span className="font-medium">{item.name}</span>
            </li>
          ))}
        </ul>

        {order.fields.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {order.fields.map((f) => (
              <li key={f.fieldId} className="bg-muted rounded-md px-2 py-1 text-xs">
                <span className="text-muted-foreground">{f.label}</span>{" "}
                <span className="font-semibold">{f.value}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {editing ? (
          <form onSubmit={saveEta} className="bg-muted/60 grid grid-cols-[1fr_1fr_auto] items-end gap-2 rounded-xl p-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`mode-${order.id}`}>{t("eta")}</Label>
              <NativeSelect
                id={`mode-${order.id}`}
                value={mode}
                onChange={(e) => setMode(e.target.value as EtaMode)}
              >
                <option value="countdown">{t("etaMode.countdown")}</option>
                <option value="clock">{t("etaMode.clock")}</option>
                <option value="minutes">{t("etaMode.minutes")}</option>
              </NativeSelect>
            </div>
            {mode === "clock" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`time-${order.id}`}>{t("time")}</Label>
                <Input id={`time-${order.id}`} name="time" type="time" required dir="ltr" />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`min-${order.id}`}>{t("minutes")}</Label>
                <Input id={`min-${order.id}`} name="minutes" type="number" min={1} max={600} required />
              </div>
            )}
            <Button type="submit" disabled={pending}>
              {tc("save")}
            </Button>
          </form>
        ) : null}

        <div className="flex items-center gap-1.5">
          {next ? (
            <Button
              variant={next.variant}
              className="flex-1"
              disabled={pending}
              onClick={() => changeStatus(next.to)}
            >
              <next.icon aria-hidden />
              {t(next.label)}
            </Button>
          ) : (
            <span className="flex-1" />
          )}
          {order.status === "preparing" ? (
            <Button
              variant="outline"
              size="icon"
              aria-label={t("editEta")}
              title={t("editEta")}
              aria-pressed={editing}
              className={cn(editing && "border-brand-strong bg-brand-soft")}
              onClick={() => setEditing((e) => !e)}
            >
              <Timer />
            </Button>
          ) : null}
          <Button variant="outline" size="icon" aria-label={t("qr")} title={t("qr")} onClick={showQr}>
            <QrCode />
          </Button>
          {canTransition(order.status, "cancelled") ? (
            <Button
              variant="destructive"
              size="icon"
              aria-label={t("cancelOrder")}
              title={t("cancelOrder")}
              disabled={pending}
              onClick={() => changeStatus("cancelled")}
            >
              <X />
            </Button>
          ) : null}
        </div>
      </div>

      <Dialog open={qr !== null} onOpenChange={(open) => !open && setQr(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("qr")} <span dir="ltr">#{order.invoiceNumber}</span>
            </DialogTitle>
            <DialogDescription>{t("qrHint")}</DialogDescription>
          </DialogHeader>
          {qr ? (
            <div className="bg-brand mx-auto rounded-2xl p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
              <img src={qr} alt={`QR #${order.invoiceNumber}`} className="size-64 rounded-lg" />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </li>
  );
}
