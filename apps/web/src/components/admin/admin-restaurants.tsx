"use client";

import type { AdminRestaurant } from "@dawry/shared";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function AdminRestaurants({ initial }: { initial: AdminRestaurant[] }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [restaurants, setRestaurants] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    setError(null);
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

  async function resetOwnerPassword(restaurant: AdminRestaurant) {
    if (!restaurant.owner) return;
    const password = window.prompt(`${t("newPassword")} (${restaurant.owner.phone})`);
    if (!password) return;
    try {
      await api(`/api/admin/users/${restaurant.owner.id}/password`, { body: { password } });
      toast.success(tc("saved"));
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : tc("error"));
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">{t("restaurants")}</h2>
        {restaurants.length === 0 ? (
          <p className="text-muted-foreground">{t("empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("owner")}</TableHead>
                <TableHead>{t("staffCount")}</TableHead>
                <TableHead>{t("ordersToday")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {restaurants.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <a href={`/r/${r.slug}`} className="font-medium underline">
                      {r.name}
                    </a>
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-col">
                      <span>{r.owner?.name}</span>
                      <span className="text-muted-foreground text-xs" dir="ltr">
                        {r.owner?.phone}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>{r.staffCount}</TableCell>
                  <TableCell>{r.ordersToday}</TableCell>
                  <TableCell>
                    <Badge variant={r.active ? "default" : "destructive"}>
                      {r.active ? tc("active") : tc("inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={r.active ? "destructive" : "default"}
                        onClick={() => setActive(r, !r.active)}
                      >
                        {r.active ? t("suspend") : t("activate")}
                      </Button>
                      {r.owner ? (
                        <Button size="sm" variant="outline" onClick={() => resetOwnerPassword(r)}>
                          {t("resetPassword")}
                        </Button>
                      ) : null}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">{t("create")}</h2>
        <form onSubmit={create} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="r-name">{t("name")}</Label>
            <Input id="r-name" name="name" required maxLength={100} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="r-slug">{t("slug")}</Label>
            <Input
              id="r-slug"
              name="slug"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              maxLength={60}
              dir="ltr"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="r-owner">{t("ownerName")}</Label>
            <Input id="r-owner" name="ownerName" required maxLength={100} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="r-phone">{t("ownerPhone")}</Label>
            <Input id="r-phone" name="ownerPhone" type="tel" required dir="ltr" />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="r-password">{t("ownerPassword")}</Label>
            <Input
              id="r-password"
              name="ownerPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              dir="ltr"
            />
          </div>
          {error ? (
            <p role="alert" className="text-destructive text-sm sm:col-span-2">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="sm:col-span-2">
            {t("create")}
          </Button>
        </form>
      </section>
    </div>
  );
}
