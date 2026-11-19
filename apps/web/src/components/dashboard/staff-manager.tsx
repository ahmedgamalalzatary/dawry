"use client";

import type { StaffMember } from "@dawry/shared";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/client";
import { ApiRequestError } from "@/lib/api/errors";

export function StaffManager({ initial }: { initial: StaffMember[] }) {
  const t = useTranslations("staff");
  const tc = useTranslations("common");
  const [staff, setStaff] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError(null);
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

  async function resetPassword(member: StaffMember) {
    const password = window.prompt(`${t("newPassword")} (${member.username})`);
    if (!password) return;
    try {
      await api(`/api/restaurant/staff/${member.id}/password`, { body: { password } });
      toast.success(tc("saved"));
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : tc("error"));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {staff.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {staff.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <span className="flex flex-col">
                <span className="font-medium">{m.name}</span>
                <span className="text-muted-foreground text-sm" dir="ltr">
                  {m.username}
                </span>
              </span>
              <span className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => resetPassword(m)}>
                  {t("resetPassword")}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  aria-label={`${tc("remove")} ${m.username}`}
                  onClick={() => remove(m)}
                >
                  {tc("remove")}
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="staff-name">{t("name")}</Label>
          <Input id="staff-name" name="name" required maxLength={100} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="staff-username">{t("username")}</Label>
          <Input
            id="staff-username"
            name="username"
            required
            minLength={3}
            maxLength={30}
            pattern="[A-Za-z0-9_.]*[A-Za-z][A-Za-z0-9_.]*"
            dir="ltr"
            aria-describedby="staff-username-hint"
          />
          <p id="staff-username-hint" className="text-muted-foreground text-xs">
            {t("usernameHint")}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="staff-password">{t("password")}</Label>
          <Input
            id="staff-password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            dir="ltr"
          />
        </div>
        {error ? (
          <p role="alert" className="text-destructive text-sm sm:col-span-3">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="sm:col-span-3">
          {t("add")}
        </Button>
      </form>
    </div>
  );
}
