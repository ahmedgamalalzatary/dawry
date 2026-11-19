"use client";

import { canTransition, type EtaMode, type OrderStatus, type StaffOrder } from "@dawry/shared";
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

const ACTIONS: { to: OrderStatus; label: "markOut" | "markDelivered" | "cancelOrder" }[] = [
  { to: "out_for_delivery", label: "markOut" },
  { to: "delivered", label: "markDelivered" },
  { to: "cancelled", label: "cancelOrder" },
];

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
  const eta = etaDisplay(order.etaMode, order.etaAt, now);

  async function run(request: Promise<StaffOrder>) {
    try {
      onChange(await request);
    } catch {
      toast.error(tc("error"));
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
    setQr(await QRCode.toDataURL(`${window.location.origin}${orderPath(slug, order.invoiceNumber)}`, { margin: 1, width: 280 }));
  }

  return (
    <li
      className={cn(
        "bg-card flex flex-col gap-3 rounded-xl border p-4",
        order.late && "border-amber-500",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-lg font-semibold" dir="ltr">
            #{order.invoiceNumber}
          </span>
          {order.customerName ? (
            <span className="text-muted-foreground text-sm">{order.customerName}</span>
          ) : null}
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {order.late ? <Badge className="bg-amber-500 text-white">{t("late")}</Badge> : null}
          <Badge variant={order.status === "preparing" ? "default" : "secondary"}>
            {to(`status.${order.status}`)}
          </Badge>
        </div>
      </div>

      <ul className="text-sm">
        {order.items.map((item, i) => (
          <li key={i}>
            {item.quantity} × {item.name}
          </li>
        ))}
      </ul>

      {order.fields.length > 0 ? (
        <p className="text-muted-foreground text-xs">
          {order.fields.map((f) => `${f.label}: ${f.value}`).join(" · ")}
        </p>
      ) : null}

      {order.status === "preparing" ? (
        <p className="text-sm tabular-nums">
          {eta.kind === "countdown" && to("eta.countdown", { remaining: eta.remaining })}
          {eta.kind === "clock" && to("eta.at", { time: formatTime(eta.clock, locale) })}
          {eta.kind === "minutes" && to("eta.minutes", { minutes: eta.minutes })}
          {" · "}
          {t("ahead", { count: order.ordersAhead })}
        </p>
      ) : null}

      {editing ? (
        <form onSubmit={saveEta} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <div className="flex flex-col gap-1">
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
            <div className="flex flex-col gap-1">
              <Label htmlFor={`time-${order.id}`}>{t("time")}</Label>
              <Input id={`time-${order.id}`} name="time" type="time" required dir="ltr" />
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <Label htmlFor={`min-${order.id}`}>{t("minutes")}</Label>
              <Input id={`min-${order.id}`} name="minutes" type="number" min={1} max={600} required />
            </div>
          )}
          <Button type="submit" size="sm">
            {tc("save")}
          </Button>
        </form>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {ACTIONS.filter((a) => canTransition(order.status, a.to)).map((a) => (
          <Button
            key={a.to}
            size="sm"
            variant={a.to === "cancelled" ? "ghost" : "default"}
            onClick={() => changeStatus(a.to)}
          >
            {t(a.label)}
          </Button>
        ))}
        {order.status === "preparing" ? (
          <Button size="sm" variant="outline" onClick={() => setEditing((e) => !e)}>
            {t("editEta")}
          </Button>
        ) : null}
        <Button size="sm" variant="outline" onClick={showQr}>
          {t("qr")}
        </Button>
      </div>

      <Dialog open={qr !== null} onOpenChange={(open) => !open && setQr(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("qr")} · #{order.invoiceNumber}
            </DialogTitle>
            <DialogDescription>{t("qrHint")}</DialogDescription>
          </DialogHeader>
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element -- generated data URL
            <img src={qr} alt={`QR #${order.invoiceNumber}`} className="mx-auto size-64" />
          ) : null}
        </DialogContent>
      </Dialog>
    </li>
  );
}
