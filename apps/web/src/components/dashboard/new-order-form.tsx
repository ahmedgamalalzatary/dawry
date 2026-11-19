"use client";

import type { CustomField, EtaMode, MenuItem, StaffOrder } from "@dawry/shared";
import { useTranslations } from "next-intl";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import { ApiRequestError } from "@/lib/api/errors";

interface Row {
  key: number;
  menuItemId?: string;
  name: string;
  quantity: number;
}

let nextKey = 0;
const emptyRow = (): Row => ({ key: nextKey++, name: "", quantity: 1 });

export function NewOrderForm({
  menu,
  fields,
  onCreated,
}: {
  menu: MenuItem[];
  fields: CustomField[];
  onCreated?: (order: StaffOrder) => void;
}) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const id = useId();
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [mode, setMode] = useState<EtaMode>("countdown");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const activeMenu = menu.filter((m) => m.active);
  const activeFields = fields.filter((f) => f.active);

  const updateRow = (key: number, patch: Partial<Row>) =>
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  function pickFromMenu(menuItemId: string) {
    const item = activeMenu.find((m) => m.id === menuItemId);
    if (!item) return;
    setRows((current) => {
      const filled = { menuItemId: item.id, name: item.name, quantity: 1 };
      const last = current.at(-1);
      if (last && !last.name) return [...current.slice(0, -1), { ...last, ...filled }];
      return [...current, { key: nextKey++, ...filled }];
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    setPending(true);
    setError(null);
    try {
      const order = await api<StaffOrder>("/api/restaurant/orders", {
        body: {
          invoiceNumber: text("invoiceNumber"),
          items: rows
            .filter((r) => r.name.trim())
            .map((r) => ({
              ...(r.menuItemId ? { menuItemId: r.menuItemId } : {}),
              name: r.name.trim(),
              quantity: r.quantity,
            })),
          fields: activeFields
            .map((f) => ({ fieldId: f.id, value: text(`field-${f.id}`) }))
            .filter((v) => v.value),
          eta:
            mode === "clock"
              ? { mode, time: text("time") }
              : { mode, minutes: Number(text("minutes")) },
          customerName: text("customerName"),
          customerPhone: text("customerPhone"),
          address: text("address"),
          notes: text("notes"),
        },
      });
      formElement.reset();
      setRows([emptyRow()]);
      setMode("countdown");
      onCreated?.(order);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) setError(t("duplicateInvoice"));
      else if (err instanceof ApiRequestError && err.status === 400) setError(err.message);
      else setError(tc("error"));
    } finally {
      setPending(false);
    }
  }

  const field = (name: string) => `${id}-${name}`;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={field("invoice")}>{t("invoice")}</Label>
        <Input id={field("invoice")} name="invoiceNumber" required maxLength={32} dir="ltr" />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium">{t("items")}</legend>
        {activeMenu.length > 0 ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor={field("menu")}>{t("fromMenu")}</Label>
            <NativeSelect
              id={field("menu")}
              value=""
              onChange={(e) => pickFromMenu(e.target.value)}
            >
              <option value="">—</option>
              {activeMenu.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        ) : null}

        {rows.map((row) => (
          <div key={row.key} className="grid grid-cols-[1fr_6rem_auto] items-end gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor={field(`name-${row.key}`)}>{t("itemName")}</Label>
              <Input
                id={field(`name-${row.key}`)}
                value={row.name}
                required={rows.length === 1}
                maxLength={100}
                onChange={(e) => updateRow(row.key, { name: e.target.value, menuItemId: undefined })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={field(`qty-${row.key}`)}>{t("quantity")}</Label>
              <Input
                id={field(`qty-${row.key}`)}
                type="number"
                min={1}
                max={999}
                value={row.quantity || ""}
                onChange={(e) => updateRow(row.key, { quantity: Number(e.target.value) })}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              disabled={rows.length === 1}
              onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
            >
              {tc("remove")}
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => setRows((r) => [...r, emptyRow()])}>
          {t("addItem")}
        </Button>
      </fieldset>

      {activeFields.map((f) => (
        <div key={f.id} className="flex flex-col gap-2">
          <Label htmlFor={field(`f-${f.id}`)}>
            {f.label}
            {f.required ? " *" : ""}
          </Label>
          <Input id={field(`f-${f.id}`)} name={`field-${f.id}`} required={f.required} maxLength={500} />
        </div>
      ))}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={field("mode")}>{t("eta")}</Label>
          <NativeSelect
            id={field("mode")}
            value={mode}
            onChange={(e) => setMode(e.target.value as EtaMode)}
          >
            <option value="countdown">{t("etaMode.countdown")}</option>
            <option value="clock">{t("etaMode.clock")}</option>
            <option value="minutes">{t("etaMode.minutes")}</option>
          </NativeSelect>
        </div>
        {mode === "clock" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor={field("time")}>{t("time")}</Label>
            <Input id={field("time")} name="time" type="time" required dir="ltr" />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor={field("minutes")}>{t("minutes")}</Label>
            <Input id={field("minutes")} name="minutes" type="number" min={1} max={600} required />
          </div>
        )}
      </div>

      <details className="rounded-lg border p-3">
        <summary className="cursor-pointer text-sm font-medium">{t("customerName")} …</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={field("cname")}>{t("customerName")}</Label>
            <Input id={field("cname")} name="customerName" maxLength={100} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={field("cphone")}>{t("customerPhone")}</Label>
            <Input id={field("cphone")} name="customerPhone" type="tel" dir="ltr" maxLength={20} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor={field("address")}>{t("address")}</Label>
            <Input id={field("address")} name="address" maxLength={500} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor={field("notes")}>{t("notes")}</Label>
            <Textarea id={field("notes")} name="notes" maxLength={500} />
          </div>
        </div>
      </details>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {t("create")}
      </Button>
    </form>
  );
}
