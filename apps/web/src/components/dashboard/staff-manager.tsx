"use client";

import type { StaffMember } from "@dawry/shared";
import { Trash2, UserPlus, UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { ResetPasswordButton } from "@/components/ui/reset-password-dialog";
import { api } from "@/lib/api/client";
import { ApiRequestError } from "@/lib/api/errors";

export function StaffManager({ initial }: { initial: StaffMember[] }) {
  const t = useTranslations("staff");
  const tc = useTranslations("common");
  const [staff, setStaff] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError(null);
    setPending(true);
    try {
      const created = await api<StaffMember>("/api/restaurant/staff", {
        body: {
          name: String(form.get("name")).trim(),
          username: String(form.get("username")).trim(),
          password: String(form.get("password")),
        },
      });
      setStaff((s) => [...s, { ...created, createdAt: new Date().toISOString() }]);
      formElement.reset();
    } catch (err) {
      setError(err instanceof ApiRequestError && err.status < 500 ? err.message : tc("error"));
    } finally {
      setPending(false);
    }
  }

  async function remove(member: StaffMember) {
    try {
      await api(`/api/restaurant/staff/${member.id}`, { method: "DELETE" });
      setStaff((s) => s.filter((m) => m.id !== member.id));
      toast.success(t("removed"));
    } catch {
      toast.error(tc("error"));
    }
  }

  async function resetPassword(member: StaffMember, password: string) {
    try {
      await api(`/api/restaurant/staff/${member.id}/password`, { body: { password } });
      toast.success(tc("saved"));
    } catch (err) {
      throw new Error(err instanceof ApiRequestError ? err.message : tc("error"));
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
      {staff.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-14 text-center">
          <UsersRound aria-hidden className="size-9 opacity-50" />
          <p>{t("empty")}</p>
        </div>
      ) : (
        <ul className="bg-card divide-y rounded-2xl border">
          {staff.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 p-4">
              <span
                aria-hidden
                className="bg-brand-soft flex size-10 shrink-0 items-center justify-center rounded-full font-bold"
              >
                {m.name.slice(0, 1)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-semibold">{m.name}</span>
                <span className="text-muted-foreground text-sm" dir="ltr">
                  {m.username}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <ResetPasswordButton
                  label={t("resetPassword")}
                  title={t("newPassword")}
                  subject={`${m.name} (${m.username})`}
                  onSave={(password) => resetPassword(m, password)}
                />
                <Button
                  size="icon-sm"
                  variant="destructive"
                  aria-label={`${tc("remove")} ${m.username}`}
                  title={tc("remove")}
                  onClick={() => remove(m)}
                >
                  <Trash2 />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="bg-card flex flex-col gap-4 rounded-2xl border p-5">
        <h3 className="flex items-center gap-2 font-semibold">
          <UserPlus aria-hidden className="text-brand-strong size-5" />
          {t("add")}
        </h3>
        <Field id="staff-name" label={t("name")}>
          <Input id="staff-name" name="name" required maxLength={100} />
        </Field>
        <Field id="staff-username" label={t("username")} hint={t("usernameHint")}>
          <Input
            id="staff-username"
            name="username"
            required
            minLength={3}
            maxLength={30}
            pattern="[A-Za-z0-9_.]*[A-Za-z][A-Za-z0-9_.]*"
            dir="ltr"
            autoComplete="off"
            aria-describedby="staff-username-hint"
          />
        </Field>
        <Field id="staff-password" label={t("password")}>
          <PasswordInput id="staff-password" name="password" required minLength={8} autoComplete="new-password" />
        </Field>
        <FormError>{error}</FormError>
        <Button type="submit" disabled={pending}>
          {t("add")}
        </Button>
      </form>
    </div>
  );
}
