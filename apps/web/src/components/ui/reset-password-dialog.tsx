"use client";

import { KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, type FormEvent } from "react";
import { Button } from "./button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./dialog";
import { Field } from "./field";
import { FormError } from "./form-error";
import { PasswordInput } from "./password-input";

/**
 * A button that opens a small dialog to set someone's new password.
 * `onSave` rejects with a message to show; resolves to close.
 */
export function ResetPasswordButton({
  label,
  title,
  subject,
  onSave,
}: {
  label: string;
  title: string;
  subject: string;
  onSave: (password: string) => Promise<void>;
}) {
  const t = useTranslations("common");
  const id = useId();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    setPending(true);
    setError(null);
    try {
      await onSave(password);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <KeyRound aria-hidden />
        {label}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setError(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription dir="auto">{subject}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field id={`${id}-pw`} label={title} hint={t("passwordRule")}>
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
            <div className="flex justify-end gap-2">
              <DialogClose render={<Button type="button" variant="ghost" />}>{t("cancel")}</DialogClose>
              <Button type="submit" disabled={pending}>
                {t("save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
