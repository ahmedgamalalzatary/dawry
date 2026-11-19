"use client";

import type { Me } from "@dawry/shared";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/client";
import { homeFor } from "@/lib/routes";

/** Phones may be typed with spaces/dashes/+; usernames are lowercased. */
function normalizeLogin(value: string) {
  const trimmed = value.trim();
  return /^[\d\s+()-]+$/.test(trimmed) ? trimmed.replace(/\D/g, "") : trimmed.toLowerCase();
}

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await api("/api/auth/sign-in/username", {
        body: {
          username: normalizeLogin(String(form.get("username"))),
          password: String(form.get("password")),
        },
      });
      const me = await api<Me>("/api/me");
      router.replace(homeFor(me));
      router.refresh();
    } catch {
      setError(t("invalid"));
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="username">{t("username")}</Label>
        <Input id="username" name="username" autoComplete="username" required dir="ltr" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          dir="ltr"
        />
      </div>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {t("signIn")}
      </Button>
    </form>
  );
}
