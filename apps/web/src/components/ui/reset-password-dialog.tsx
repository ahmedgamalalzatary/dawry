"use client";

import { useTranslations } from "next-intl";
import { useId, useState, type FormEvent } from "react";
import { Button } from "./button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./dialog";
import { Field } from "./field";
import { FormError } from "./form-error";
import { PasswordInput } from "./password-input";

/**
 * A small dialog to set someone's new password, opened from a row's menu.
 * `onSave` rejects with a message to show; resolves to close.
 */
export function ResetPasswordDialog({
  open,
  onOpenChange,
  title,
  subject,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subject: string;
  onSave: (password: string) => Promise<void>;
}) {
  const t = useTranslations("common");
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    setPending(true);
    setError(null);
    try {
      await onSave(password);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setError(null);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription dir="auto">{subject}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field id={`${id}-pw`} label={t("newPassword")} hint={t("passwordRule")}>
            <PasswordInput
              id={`${id}-pw`}
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
              aria-describedby={`${id}-pw-hint`}
              autoFocus
            />
          </Field>
          <FormError>{error}</FormError>
          <div className="flex justify-end gap-2 pt-1">
            <DialogClose render={<Button type="button" variant="ghost" />}>{t("cancel")}</DialogClose>
            <Button type="submit" disabled={pending}>
              {t("save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
