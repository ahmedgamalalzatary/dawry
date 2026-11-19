"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/client";
import { ApiRequestError } from "@/lib/api/errors";

export function SignUpForm() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await api("/api/customer/sign-up", {
        body: {
          name: String(form.get("name")).trim(),
          phone: String(form.get("phone")),
          password: String(form.get("password")),
        },
      });
      router.replace("/me");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError && err.status === 409 ? t("phoneTaken") : tc("error"));
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">{t("name")}</Label>
        <Input id="name" name="name" autoComplete="name" required maxLength={100} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">{t("phone")}</Label>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" required dir="ltr" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          dir="ltr"
          aria-describedby="password-hint"
        />
        <p id="password-hint" className="text-muted-foreground text-xs">
          {t("passwordHint")}
        </p>
      </div>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {t("signUp")}
      </Button>
    </form>
  );
}
