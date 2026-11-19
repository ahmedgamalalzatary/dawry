"use client";

import type { AdminRestaurant } from "@dawry/shared";
import { Ban, CircleCheck, Plus, Store } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { RestaurantAvatar } from "@/components/customer/restaurant-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { ResetPasswordButton } from "@/components/ui/reset-password-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api/client";
import { ApiRequestError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

export function AdminRestaurants({ initial }: { initial: AdminRestaurant[] }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [restaurants, setRestaurants] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    setError(null);
    setPending(true);
    try {
      await api("/api/admin/restaurants", {
        body: {
          name: text("name"),
          slug: text("slug"),
          ownerName: text("ownerName"),
          ownerPhone: text("ownerPhone"),
          ownerPassword: String(form.get("ownerPassword")),
        },
      });
      setRestaurants(await api<AdminRestaurant[]>("/api/admin/restaurants"));
      formElement.reset();
      toast.success(t("created"));
    } catch (err) {
      setError(err instanceof ApiRequestError && err.status < 500 ? err.message : tc("error"));
    } finally {
      setPending(false);
    }
  }

  async function setActive(restaurant: AdminRestaurant, active: boolean) {
    try {
      await api(`/api/admin/restaurants/${restaurant.id}`, { method: "PATCH", body: { active } });
      setRestaurants((list) => list.map((r) => (r.id === restaurant.id ? { ...r, active } : r)));
    } catch {
      toast.error(tc("error"));
    }
  }

  async function resetOwnerPassword(ownerId: string, password: string) {
    try {
      await api(`/api/admin/users/${ownerId}/password`, { body: { password } });
      toast.success(tc("saved"));
    } catch (err) {
      throw new Error(err instanceof ApiRequestError ? err.message : tc("error"));
    }
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1fr_22rem]">
      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          {t("restaurants")}
          <span className="bg-secondary text-muted-foreground rounded-full px-2 py-0.5 text-xs tabular-nums">
            {restaurants.length}
          </span>
        </h2>
        {restaurants.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-14 text-center">
            <Store aria-hidden className="size-9 opacity-50" />
            <p>{t("empty")}</p>
          </div>
        ) : (
          <div className="bg-card overflow-hidden rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="ps-4">{t("name")}</TableHead>
                  <TableHead>{t("owner")}</TableHead>
                  <TableHead>{t("staffCount")}</TableHead>
                  <TableHead>{t("ordersToday")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="pe-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {restaurants.map((r) => (
                  <TableRow key={r.id} className={cn(!r.active && "bg-destructive-soft/40")}>
                    <TableCell className="ps-4">
                      <Link
                        href={`/r/${r.slug}`}
                        className="group flex items-center gap-3 outline-none"
                      >
                        <RestaurantAvatar name={r.name} logoUrl={null} className="size-9 rounded-lg text-base" />
                        <span className="flex flex-col">
                          <span className="font-semibold group-hover:underline group-focus-visible:underline">
                            {r.name}
                          </span>
                          <span className="text-muted-foreground text-xs" dir="ltr">
                            /r/{r.slug}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="flex flex-col">
                        <span>{r.owner?.name}</span>
                        <span className="text-muted-foreground text-xs tabular-nums" dir="ltr">
                          {r.owner?.phone}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums">{r.staffCount}</TableCell>
                    <TableCell className="font-semibold tabular-nums">{r.ordersToday}</TableCell>
                    <TableCell>
                      <Badge variant={r.active ? "delivered" : "destructive"}>
                        {r.active ? <CircleCheck aria-hidden /> : <Ban aria-hidden />}
                        {r.active ? tc("active") : tc("inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell className="pe-4">
                      <span className="flex justify-end gap-1.5">
                        {r.owner ? (
                          <ResetPasswordButton
                            label={t("resetPassword")}
                            title={t("newPassword")}
                            subject={`${r.owner.name} (${r.owner.phone})`}
                            onSave={(password) => resetOwnerPassword(r.owner!.id, password)}
                          />
                        ) : null}
                        <Button
                          size="sm"
                          variant={r.active ? "destructive" : "success"}
                          onClick={() => setActive(r, !r.active)}
                        >
                          {r.active ? t("suspend") : t("activate")}
                        </Button>
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="bg-card flex flex-col gap-4 rounded-2xl border p-5 xl:sticky xl:top-20">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <span className="bg-brand text-brand-foreground flex size-7 items-center justify-center rounded-lg">
            <Plus aria-hidden className="size-4" />
          </span>
          {t("create")}
        </h2>
        <form onSubmit={create} className="flex flex-col gap-4">
          <Field id="r-name" label={t("name")}>
            <Input id="r-name" name="name" required maxLength={100} />
          </Field>
          <Field id="r-slug" label={t("slug")}>
            <Input
              id="r-slug"
              name="slug"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              maxLength={60}
              dir="ltr"
              autoComplete="off"
            />
          </Field>
          <Field id="r-owner" label={t("ownerName")}>
            <Input id="r-owner" name="ownerName" required maxLength={100} />
          </Field>
          <Field id="r-phone" label={t("ownerPhone")}>
            <Input id="r-phone" name="ownerPhone" type="tel" required dir="ltr" />
          </Field>
          <Field id="r-password" label={t("ownerPassword")}>
            <PasswordInput id="r-password" name="ownerPassword" required minLength={8} autoComplete="new-password" />
          </Field>
          <FormError>{error}</FormError>
          <Button type="submit" variant="brand" disabled={pending}>
            {t("create")}
          </Button>
        </form>
      </section>
    </div>
  );
}
