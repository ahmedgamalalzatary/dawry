"use client";

import type { CustomField, MenuItem } from "@dawry/shared";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api/client";

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
    <div className="flex flex-col gap-4">
      {items.length === 0 ? <p className="text-muted-foreground">{t("empty")}</p> : null}
      <ul className="divide-y rounded-lg border">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2 p-3">
            <span className={item.active ? "" : "text-muted-foreground line-through"}>{item.name}</span>
            <label className="flex items-center gap-2 text-sm">
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
      <form onSubmit={add} className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="menu-name">{t("name")}</Label>
          <Input id="menu-name" name="name" required maxLength={100} />
        </div>
        <Button type="submit">{t("add")}</Button>
      </form>
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
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">{t("hint")}</p>
      {fields.length === 0 ? <p className="text-muted-foreground">{t("empty")}</p> : null}
      <ul className="divide-y rounded-lg border">
        {fields.map((field) => (
          <li key={field.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
            <span className={field.active ? "font-medium" : "text-muted-foreground line-through"}>
              {field.label}
            </span>
            <span className="flex flex-wrap gap-4 text-sm">
              {(["required", "public", "active"] as const).map((key) => (
                <label key={key} className="flex items-center gap-2">
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
      <form onSubmit={add} className="flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="field-label">{t("label")}</Label>
          <Input id="field-label" name="label" required maxLength={100} />
        </div>
        <div className="flex gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="required" /> {t("required")}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="public" /> {t("public")}
          </label>
        </div>
        <Button type="submit">{t("add")}</Button>
      </form>
    </div>
  );
}
