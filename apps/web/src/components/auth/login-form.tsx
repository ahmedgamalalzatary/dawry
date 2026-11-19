"use client";

import type { Me } from "@dawry/shared";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { PasswordInput } from "@/components/ui/password-input";
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
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Field id="username" label={t("username")}>
        <Input id="username" name="username" autoComplete="username" required dir="ltr" />
      </Field>
      <Field id="password" label={t("password")}>
        <PasswordInput id="password" name="password" autoComplete="current-password" required />
      </Field>
      <FormError>{error}</FormError>
      <Button type="submit" size="lg" disabled={pending}>
        {t("signIn")}
      </Button>
    </form>
  );
}
