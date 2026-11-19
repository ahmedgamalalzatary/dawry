"use client";

import type { CustomField, EtaMode, MenuItem, StaffOrder } from "@dawry/shared";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import { ApiRequestError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import { EtaModePicker } from "./order-row";

const PRESETS = [10, 15, 20, 30, 45];

interface Row {
  key: number;
  menuItemId?: string;
  name: string;
  quantity: number;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3 border-t pt-5 first:border-t-0 first:pt-0">
      <legend className="float-start mb-1 w-full text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

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
  // Row keys are per form (not module-wide) so server and client render the same ids.
  const nextKey = useRef(1);
  const emptyRow = (): Row => ({ key: nextKey.current++, name: "", quantity: 1 });
  const [rows, setRows] = useState<Row[]>([{ key: 0, name: "", quantity: 1 }]);
  const [mode, setMode] = useState<EtaMode>("countdown");
  const [minutes, setMinutes] = useState("");
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
      return [...current, { key: nextKey.current++, ...filled }];
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
          eta: mode === "clock" ? { mode, time: text("time") } : { mode, minutes: Number(text("minutes")) },
          customerName: text("customerName"),
          customerPhone: text("customerPhone"),
          address: text("address"),
          notes: text("notes"),
        },
      });
      formElement.reset();
      setRows([emptyRow()]);
      setMode("countdown");
      setMinutes("");
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
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={field("invoice")}>{t("invoice")}</Label>
        <Input
          id={field("invoice")}
          name="invoiceNumber"
          required
          maxLength={32}
          dir="ltr"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          placeholder="000"
          className="figure h-14 text-center text-3xl font-semibold md:text-3xl"
        />
      </div>

      <Section title={t("items")}>
        {activeMenu.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field("menu")} className="text-muted-foreground font-normal">
              {t("fromMenu")}
            </Label>
            <NativeSelect id={field("menu")} value="" onChange={(e) => pickFromMenu(e.target.value)}>
              <option value="">{t("pickItem")}</option>
              {activeMenu.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        ) : null}

        <ul className="flex flex-col gap-2">
          {rows.map((row, index) => (
            <li key={row.key} className="grid grid-cols-[1fr_5rem_2.5rem] items-end gap-2">
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor={field(`name-${row.key}`)}
                  className={cn("text-muted-foreground font-normal", index > 0 && "sr-only")}
                >
                  {t("itemName")}
                </Label>
                <Input
                  id={field(`name-${row.key}`)}
                  value={row.name}
                  required={rows.length === 1}
                  maxLength={100}
                  onChange={(e) => updateRow(row.key, { name: e.target.value, menuItemId: undefined })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor={field(`qty-${row.key}`)}
                  className={cn("text-muted-foreground font-normal", index > 0 && "sr-only")}
                >
                  {t("quantity")}
                </Label>
                <Input
                  id={field(`qty-${row.key}`)}
                  type="number"
                  min={1}
                  max={999}
                  className="text-center"
                  value={row.quantity || ""}
                  onChange={(e) => updateRow(row.key, { quantity: Number(e.target.value) })}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={tc("remove")}
                title={tc("remove")}
                className="text-muted-foreground hover:text-late"
                disabled={rows.length === 1}
                onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-link self-start"
          onClick={() => setRows((r) => [...r, emptyRow()])}
        >
          <Plus aria-hidden />
          {t("addItem")}
        </Button>
      </Section>

      {activeFields.length > 0 ? (
        <Section title={t("details")}>
          <div className="grid gap-4 sm:grid-cols-2">
            {activeFields.map((f) => (
              <div key={f.id} className="flex flex-col gap-1.5">
                <Label htmlFor={field(`f-${f.id}`)}>
                  {f.label}
                  {f.required ? <span className="text-late">*</span> : null}
                </Label>
                <Input id={field(`f-${f.id}`)} name={`field-${f.id}`} required={f.required} maxLength={500} />
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      <Section title={t("eta")}>
        <EtaModePicker value={mode} onChange={setMode} name="etaMode" />
        {mode === "clock" ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field("time")}>{t("time")}</Label>
            <Input id={field("time")} name="time" type="time" required dir="ltr" />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor={field("minutes")}>{t("minutes")}</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id={field("minutes")}
                name="minutes"
                type="number"
                min={1}
                max={600}
                required
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="w-24 text-center"
              />
              <div role="group" aria-label={t("presets")} className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setMinutes(String(p))}
                    aria-pressed={minutes === String(p)}
                    className={cn(
                      "figure h-10 min-w-11 cursor-pointer rounded-lg border px-3 text-sm font-medium transition-colors",
                      minutes === String(p)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border-strong bg-surface hover:bg-muted",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Section>

      <details className="group border-t pt-5">
        <summary className="hover:text-foreground text-muted-foreground flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          {t("customerDetails")}
          <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field("cname")}>{t("customerName")}</Label>
            <Input id={field("cname")} name="customerName" maxLength={100} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field("cphone")}>{t("customerPhone")}</Label>
            <Input id={field("cphone")} name="customerPhone" type="tel" dir="ltr" maxLength={20} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor={field("address")}>{t("address")}</Label>
            <Input id={field("address")} name="address" maxLength={500} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor={field("notes")}>{t("notes")}</Label>
            <Textarea id={field("notes")} name="notes" maxLength={500} />
          </div>
        </div>
      </details>

      <FormError>{error}</FormError>
      <Button type="submit" size="lg" disabled={pending}>
        {t("create")}
      </Button>
    </form>
  );
}
