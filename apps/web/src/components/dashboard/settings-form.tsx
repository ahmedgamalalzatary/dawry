"use client";

import type { RestaurantSettings } from "@dawry/shared";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/client";
import { ApiRequestError } from "@/lib/api/errors";

export function SettingsForm({ initial }: { initial: RestaurantSettings }) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [pending, setPending] = useState(false);
  const link = `/r/${initial.slug}`;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    try {
      await api("/api/restaurant/settings", {
        method: "PUT",
        body: {
          name: String(form.get("name")).trim(),
          phone: String(form.get("phone")).trim(),
          logoUrl: String(form.get("logoUrl")).trim(),
        },
      });
      toast.success(tc("saved"));
    } catch (err) {
      toast.error(err instanceof ApiRequestError && err.status === 400 ? err.message : tc("error"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="s-name">{t("name")}</Label>
        <Input id="s-name" name="name" defaultValue={initial.name} required maxLength={100} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="s-phone">{t("phone")}</Label>
        <Input id="s-phone" name="phone" type="tel" defaultValue={initial.phone} dir="ltr" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="s-logo">{t("logoUrl")}</Label>
        <Input
          id="s-logo"
          name="logoUrl"
          type="url"
          defaultValue={initial.logoUrl}
          placeholder="https://"
          dir="ltr"
        />
      </div>
      <div className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">{t("publicLink")}</span>
        <a href={link} className="text-primary underline" dir="ltr">
          {link}
        </a>
      </div>
      <Button type="submit" disabled={pending}>
        {tc("save")}
      </Button>
    </form>
  );
}
