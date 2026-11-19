"use client";

import { LOGO_MAX_BYTES, LOGO_TYPES, UPLOADED_LOGO, type RestaurantSettings } from "@dawry/shared";
import { Copy, Eye, ImageUp, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRef, useState, useSyncExternalStore, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { RestaurantAvatar } from "@/components/customer/restaurant-avatar";
import { PageBody, PageHeader } from "@/components/layout/app-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import { ApiRequestError, toApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

const noop = () => () => {};

/** A settings group: what it is on the start side, its controls on the other. */
function Group({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="grid gap-x-10 gap-y-4 border-b py-8 first:pt-0 last:border-b-0 md:grid-cols-[16rem_1fr]">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">{hint}</p>
      </div>
      <div className="flex max-w-xl flex-col gap-5">{children}</div>
    </section>
  );
}

export function SettingsForm({ initial }: { initial: RestaurantSettings }) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(initial.name);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploaded = UPLOADED_LOGO.test(logoUrl);
  const previewUrl = uploaded || /^https?:\/\//.test(logoUrl) ? logoUrl : null;

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!(LOGO_TYPES as readonly string[]).includes(file.type) || file.size > LOGO_MAX_BYTES) {
      toast.error(t("logoRule"));
      return;
    }
    setUploading(true);
    try {
      const res = await fetch("/api/restaurant/settings/logo", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw await toApiError(res);
      setLogoUrl(((await res.json()) as RestaurantSettings).logoUrl);
      toast.success(t("logoUploaded"));
    } catch (err) {
      toast.error(err instanceof ApiRequestError && err.status < 500 ? t("logoRule") : tc("error"));
    } finally {
      setUploading(false);
    }
  }

  async function removeLogo() {
    setUploading(true);
    try {
      if (uploaded) await api("/api/restaurant/settings/logo", { method: "DELETE" });
      else await api("/api/restaurant/settings", { method: "PUT", body: { name, phone: initial.phone, logoUrl: "" } });
      setLogoUrl("");
      toast.success(t("logoRemoved"));
    } catch {
      toast.error(tc("error"));
    } finally {
      setUploading(false);
    }
  }
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
          // An uploaded logo is kept unless a link replaces it.
          logoUrl: String(form.get("logoUrl") ?? "").trim() || (uploaded ? logoUrl : ""),
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
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <PageBody>
        <form onSubmit={onSubmit}>
          <Group title={t("profile")} hint={t("profileHint")}>
            <Field id="s-name" label={t("name")}>
              <Input id="s-name" name="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
            </Field>
            <Field id="s-phone" label={t("phone")} hint={t("phoneHint")}>
              <Input id="s-phone" name="phone" type="tel" defaultValue={initial.phone} dir="ltr" aria-describedby="s-phone-hint" />
            </Field>
            <Button type="submit" className="self-start" disabled={pending}>
              {t("saveChanges")}
            </Button>
          </Group>

          <Group title={t("logo")} hint={t("logoHint")}>
            <div className="flex flex-wrap items-center gap-4">
              <RestaurantAvatar name={name || "?"} logoUrl={previewUrl} className="size-20 rounded-2xl text-3xl" />
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileInput}
                    type="file"
                    accept={LOGO_TYPES.join(",")}
                    onChange={upload}
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden
                  />
                  <Button type="button" variant="outline" disabled={uploading} onClick={() => fileInput.current?.click()}>
                    <ImageUp aria-hidden />
                    {previewUrl ? t("replaceLogo") : t("uploadLogo")}
                  </Button>
                  {previewUrl ? (
                    <Button type="button" variant="ghost" disabled={uploading} onClick={() => void removeLogo()}>
                      <Trash2 aria-hidden />
                      {t("removeLogo")}
                    </Button>
                  ) : null}
                </div>
                <p className="text-muted-foreground text-xs">{t("logoRule")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="bg-border h-px flex-1" />
              <span className="text-muted-foreground">{t("orLink")}</span>
              <span className="bg-border h-px flex-1" />
            </div>
            <Field id="s-logo" label={t("logoUrl")}>
              <Input
                id="s-logo"
                name="logoUrl"
                type={uploaded ? "text" : "url"}
                value={uploaded ? "" : logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder={uploaded ? t("logoUploadedNote") : "https://"}
                dir="ltr"
              />
            </Field>
            <Button type="submit" variant="outline" className="self-start" disabled={pending}>
              {t("saveLogoLink")}
            </Button>
          </Group>
        </form>

        <Group title={t("publicLink")} hint={t("publicLinkHint")}>
          <div className="flex flex-col gap-2 sm:flex-row">
            <code className="bg-muted flex h-10 min-w-0 flex-1 items-center truncate rounded-lg px-3 text-sm" dir="ltr">
              {origin}
              {link}
            </code>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={copyLink}>
                <Copy aria-hidden />
                {t("copy")}
              </Button>
              <Link href={link} className={cn(buttonVariants({ variant: "outline" }), "flex-1")}>
                <Eye aria-hidden />
                {t("open")}
              </Link>
            </div>
          </div>
        </Group>
      </PageBody>
    </>
  );
}
