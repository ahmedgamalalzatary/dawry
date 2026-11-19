"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { PasswordInput } from "@/components/ui/password-input";
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
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Field id="name" label={t("name")}>
        <Input id="name" name="name" autoComplete="name" required maxLength={100} />
      </Field>
      <Field id="phone" label={t("phone")}>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" required dir="ltr" />
      </Field>
      <Field id="password" label={t("password")} hint={t("passwordHint")}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          aria-describedby="password-hint"
        />
      </Field>
      <FormError>{error}</FormError>
      <Button type="submit" size="lg" disabled={pending}>
        {t("signUp")}
      </Button>
    </form>
  );
}
