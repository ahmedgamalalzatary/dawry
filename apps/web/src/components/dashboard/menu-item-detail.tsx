"use client";

import type { MenuItem, MenuItemDetail } from "@dawry/shared";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageBody, PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { BarChart, Panel, StatStrip } from "@/components/ui/stats";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api/client";
import { ApiRequestError } from "@/lib/api/errors";
import { formatDay, formatTime, shortDay } from "@/lib/format";

/** The last 30 business days, oldest first, with zero-days filled in. */
function lastDays(to: string, n: number) {
  const end = Date.parse(`${to}T00:00:00Z`);
  return Array.from({ length: n }, (_, i) => new Date(end - (n - 1 - i) * 86_400_000).toISOString().slice(0, 10));
}

export function MenuItemDetailView({ detail, today }: { detail: MenuItemDetail; today: string }) {
  const t = useTranslations("menu");
  const tp = useTranslations("menuPage");
  const tc = useTranslations("common");
  const locale = useLocale();
  const timeZone = useTimeZone();
  const [item, setItem] = useState<MenuItem>(detail.item);
  const [pending, setPending] = useState(false);

  async function patch(body: Partial<MenuItem>) {
    setPending(true);
    try {
      setItem(await api<MenuItem>(`/api/restaurant/menu/${item.id}`, { method: "PATCH", body }));
      toast.success(tc("saved"));
    } catch (err) {
      toast.error(err instanceof ApiRequestError && err.status === 400 ? err.message : tc("error"));
    } finally {
      setPending(false);
    }
  }

  function rename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name")).trim();
    if (name && name !== item.name) void patch({ name });
  }

  const perDay = new Map(detail.days.map((d) => [d.day, d.quantity]));
  const days = lastDays(today, 30);
  const last = detail.lastOrderedAt
    ? formatDay(detail.lastOrderedAt.slice(0, 10), locale, { day: "numeric", month: "short" })
    : "—";

  return (
    <>
      <PageHeader
        back={{ href: "/dashboard/menu", label: t("title") }}
        title={item.name}
        meta={<Badge variant={item.active ? "active" : "inactive"}>{item.active ? t("onMenu") : t("hidden")}</Badge>}
        description={tp("hint")}
      />
      <PageBody className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <StatStrip
            items={[
              { label: tp("sold"), value: detail.quantity },
              { label: tp("orders"), value: detail.orders },
              { label: tp("perOrder"), value: detail.orders ? (detail.quantity / detail.orders).toFixed(1) : "—" },
              { label: tp("last"), value: last, hint: detail.lastOrderedAt ? formatTime(detail.lastOrderedAt, locale, timeZone) : undefined },
            ]}
          />
          <Panel title={tp("chart")} description={tp("chartHint")}>
            <BarChart
              label={tp("chart")}
              labelEvery={5}
              bars={days.map((day) => ({
                key: day,
                label: shortDay(day),
                value: perDay.get(day) ?? 0,
                readout: `${formatDay(day, locale)} · ${tp("soldN", { n: perDay.get(day) ?? 0 })}`,
              }))}
            />
          </Panel>
        </div>

        <Panel title={tp("edit")}>
          <form onSubmit={rename} className="flex flex-col gap-4">
            <Field id="item-name" label={t("name")}>
              <Input id="item-name" name="name" defaultValue={item.name} required maxLength={100} />
            </Field>
            <Button type="submit" variant="outline" disabled={pending} className="self-start">
              {tc("save")}
            </Button>
          </form>
          <label className="mt-5 flex cursor-pointer items-start justify-between gap-4 border-t pt-5">
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{t("onMenu")}</span>
              <span className="text-muted-foreground text-xs">{tp("onMenuHint")}</span>
            </span>
            <Switch checked={item.active} disabled={pending} onCheckedChange={(active) => void patch({ active })} aria-label={t("onMenu")} />
          </label>
        </Panel>
      </PageBody>
    </>
  );
}
