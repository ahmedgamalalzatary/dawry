"use client";

import type { CustomField, MenuItem } from "@dawry/shared";
import { ListPlus, Plus, UtensilsCrossed } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";

function useSaver() {
  const tc = useTranslations("common");
  return async <T,>(request: Promise<T>): Promise<T | null> => {
    try {
      return await request;
    } catch {
      toast.error(tc("error"));
      return null;
    }
  };
}

function EmptyList({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-12 text-center">
      {icon}
      <p>{children}</p>
    </div>
  );
}

export function MenuManager({ initial }: { initial: MenuItem[] }) {
  const t = useTranslations("menu");
  const tc = useTranslations("common");
  const save = useSaver();
  const [items, setItems] = useState(initial);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const name = String(new FormData(formElement).get("name")).trim();
    const created = await save(api<MenuItem>("/api/restaurant/menu", { body: { name } }));
    if (created) {
      setItems((list) => [...list, created].sort((a, b) => a.name.localeCompare(b.name)));
      formElement.reset();
    }
  }

  async function toggle(item: MenuItem, active: boolean) {
    const updated = await save(
      api<MenuItem>(`/api/restaurant/menu/${item.id}`, { method: "PATCH", body: { active } }),
    );
    if (updated) setItems((list) => list.map((i) => (i.id === item.id ? updated : i)));
  }

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <form onSubmit={add} className="bg-card flex items-end gap-2 rounded-2xl border p-4">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="menu-name">{t("name")}</Label>
          <Input id="menu-name" name="name" required maxLength={100} />
        </div>
        <Button type="submit">
          <Plus aria-hidden />
          {t("add")}
        </Button>
      </form>
      {items.length === 0 ? (
        <EmptyList icon={<UtensilsCrossed aria-hidden className="size-9 opacity-50" />}>{t("empty")}</EmptyList>
      ) : (
        <ul className="bg-card grid divide-y rounded-2xl border sm:grid-cols-2 sm:divide-y-0">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 px-4 py-3 sm:border-b sm:odd:border-e"
            >
              <span className={cn("font-medium", !item.active && "text-muted-foreground line-through")}>
                {item.name}
              </span>
              <label className="text-muted-foreground flex items-center gap-2 text-xs">
                {item.active ? tc("active") : tc("inactive")}
                <Switch
                  checked={item.active}
                  onCheckedChange={(checked) => toggle(item, checked)}
                  aria-label={item.name}
                />
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FieldsManager({ initial }: { initial: CustomField[] }) {
  const t = useTranslations("fields");
  const tc = useTranslations("common");
  const save = useSaver();
  const [fields, setFields] = useState(initial);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const created = await save(
      api<CustomField>("/api/restaurant/fields", {
        body: {
          label: String(form.get("label")).trim(),
          required: form.get("required") === "on",
          public: form.get("public") === "on",
        },
      }),
    );
    if (created) {
      setFields((list) => [...list, created]);
      formElement.reset();
    }
  }

  async function update(field: CustomField, patch: Partial<CustomField>) {
    const updated = await save(
      api<CustomField>(`/api/restaurant/fields/${field.id}`, { method: "PATCH", body: patch }),
    );
    if (updated) setFields((list) => list.map((f) => (f.id === field.id ? updated : f)));
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
      {fields.length === 0 ? (
        <EmptyList icon={<ListPlus aria-hidden className="size-9 opacity-50" />}>{t("empty")}</EmptyList>
      ) : (
        <ul className="bg-card divide-y rounded-2xl border">
          {fields.map((field) => (
            <li key={field.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
              <span
                className={cn(
                  "font-semibold",
                  !field.active && "text-muted-foreground font-normal line-through",
                )}
              >
                {field.label}
              </span>
              <span className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                {(["required", "public", "active"] as const).map((key) => (
                  <label key={key} className="text-muted-foreground flex items-center gap-2">
                    {key === "active" ? tc("active") : t(key)}
                    <Switch
                      checked={field[key]}
                      onCheckedChange={(checked) => update(field, { [key]: checked })}
                      aria-label={`${field.label}: ${key === "active" ? tc("active") : t(key)}`}
                    />
                  </label>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="bg-card flex flex-col gap-4 rounded-2xl border p-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="field-label">{t("label")}</Label>
          <Input id="field-label" name="label" required maxLength={100} />
        </div>
        <div className="flex flex-col gap-2.5 text-sm">
          {(["required", "public"] as const).map((key) => (
            <label key={key} className="flex cursor-pointer items-center gap-2.5">
              <input type="checkbox" name={key} className="accent-brand-strong size-4 cursor-pointer" />
              {t(key)}
            </label>
          ))}
        </div>
        <Button type="submit">
          <Plus aria-hidden />
          {t("add")}
        </Button>
      </form>
    </div>
  );
}
