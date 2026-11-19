"use client";

import type { RestaurantSettings } from "@dawry/shared";
import { Copy, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { toast } from "sonner";
import { RestaurantAvatar } from "@/components/customer/restaurant-avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import { ApiRequestError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

const noop = () => () => {};

export function SettingsForm({ initial }: { initial: RestaurantSettings }) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(initial.name);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
  const link = `/r/${initial.slug}`;
  // The site's own address, known only in the browser.
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");

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

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(origin + link);
      toast.success(t("copied"));
    } catch {
      toast.error(tc("error"));
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
      <form onSubmit={onSubmit} className="bg-card flex flex-col gap-5 rounded-2xl border p-5 sm:p-6">
        <Field id="s-name" label={t("name")}>
          <Input id="s-name" name="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
        </Field>
        <Field id="s-phone" label={t("phone")}>
          <Input id="s-phone" name="phone" type="tel" defaultValue={initial.phone} dir="ltr" />
        </Field>
        <Field id="s-logo" label={t("logoUrl")}>
          <Input
            id="s-logo"
            name="logoUrl"
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://"
            dir="ltr"
          />
        </Field>
        <Button type="submit" className="self-start" disabled={pending}>
          {tc("save")}
        </Button>
      </form>

      <aside className="flex flex-col gap-4">
        {/* What customers will see */}
        <div className="bg-card flex flex-col items-center gap-3 rounded-2xl border p-6 text-center">
          <RestaurantAvatar
            name={name || "?"}
            logoUrl={/^https?:\/\//.test(logoUrl) ? logoUrl : null}
            className="size-16 rounded-2xl text-2xl"
          />
          <p className="text-lg font-bold">{name}</p>
          <p className="text-muted-foreground text-xs">{t("preview")}</p>
        </div>
        <div className="bg-card flex flex-col gap-3 rounded-2xl border p-5">
          <span className="text-sm font-semibold">{t("publicLink")}</span>
          <code className="bg-muted truncate rounded-lg px-3 py-2 text-sm" dir="ltr">
            {origin}
            {link}
          </code>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="flex-1" onClick={copyLink}>
              <Copy aria-hidden />
              {t("copy")}
            </Button>
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}
            >
              <ExternalLink aria-hidden />
              {t("open")}
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}
