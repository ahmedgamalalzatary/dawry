"use client";

import type { Me } from "@dawry/shared";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { api } from "@/lib/api/client";
import { homeFor, type Portal } from "@/lib/routes";

/** Phones may be typed with spaces/dashes/+; usernames are lowercased. */
function normalizeLogin(value: string) {
  const trimmed = value.trim();
  return /^[\d\s+()-]+$/.test(trimmed) ? trimmed.replace(/\D/g, "") : trimmed.toLowerCase();
}

/** Customers and owners sign in with a phone number; staff and the super-admin with a username. */
const BY_PHONE: Record<Portal, boolean> = { customer: true, owner: true, staff: false, admin: false };

/**
 * Signs in on one role's own page. An account of another role is signed
 * straight back out and told to use its own entrance.
 */
export function LoginForm({ portal }: { portal: Portal }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const byPhone = BY_PHONE[portal];

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
    } catch {
      setError(byPhone ? t("invalidPhone") : t("invalidUsername"));
      setPending(false);
      return;
    }
    try {
      const me = await api<Me>("/api/me");
      if (me.kind !== portal) {
        await api("/api/auth/sign-out", { body: {} }).catch(() => undefined);
        setError(t("wrongPortal"));
        setPending(false);
        return;
      }
      router.replace(homeFor(me));
      router.refresh();
    } catch {
      setError(t("failed"));
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Field id="username" label={byPhone ? t("phone") : t("usernameLabel")}>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          inputMode={byPhone ? "tel" : "text"}
          required
          dir="ltr"
        />
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
