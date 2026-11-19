"use client";

import type { AdminRestaurant } from "@dawry/shared";
import { Ban, CircleCheck, CircleDot, Eye, KeyRound, MoreHorizontal, Plus, Store } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageBody, PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { ListToolbar, NoMatches, ResultCount, SearchField, SortHeader } from "@/components/ui/list-toolbar";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { PasswordInput } from "@/components/ui/password-input";
import { ResetPasswordDialog } from "@/components/ui/reset-password-dialog";
import { api } from "@/lib/api/client";
import { ApiRequestError } from "@/lib/api/errors";
import { matchesSearch, useParam, useSort } from "@/lib/list";
import { cn } from "@/lib/utils";

const FILTERS = ["all", "active", "suspended"] as const;
type Filter = (typeof FILTERS)[number];
const SORTS = ["name", "owner", "staff", "ordersToday", "status", "joined"] as const;
type Sort = (typeof SORTS)[number];
/** Ascending comparisons; the chosen direction flips them. */
const SORTERS: Record<Sort, (a: AdminRestaurant, b: AdminRestaurant) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  owner: (a, b) => (a.owner?.name ?? "").localeCompare(b.owner?.name ?? ""),
  staff: (a, b) => a.staffCount - b.staffCount || a.name.localeCompare(b.name),
  ordersToday: (a, b) => a.ordersToday - b.ordersToday || a.name.localeCompare(b.name),
  status: (a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name),
  joined: (a, b) => a.createdAt.localeCompare(b.createdAt),
};

export function AdminRestaurants({
  initial,
  title,
  description,
}: {
  initial: AdminRestaurant[];
  title: string;
  description: string;
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [restaurants, setRestaurants] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<AdminRestaurant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const tl = useTranslations("list");
  const [query, setQuery] = useParam("q", "");
  const [filter, setFilter] = useParam<Filter>("show", "all", FILTERS);
  const sorting = useSort(SORTS, "name");
  const activeCount = restaurants.filter((r) => r.active).length;
  const visible = restaurants
    .filter((r) => filter === "all" || (filter === "active") === r.active)
    .filter((r) => matchesSearch(query, r.name, r.slug, r.owner?.name, r.owner?.phone))
    .sort((a, b) => sorting.sign * SORTERS[sorting.column](a, b));
  const reset = () => {
    setQuery("");
    setFilter("all");
  };

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
      setCreating(false);
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
      toast.success(active ? t("activated") : t("suspended"));
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
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden />
            {t("create")}
          </Button>
        }
      />
      <PageBody className="flex flex-col gap-4">
        {restaurants.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
            <Store aria-hidden className="text-muted-foreground size-8" />
            <p className="font-medium">{t("empty")}</p>
            <Button variant="outline" onClick={() => setCreating(true)}>
              <Plus aria-hidden />
              {t("create")}
            </Button>
          </div>
        ) : (
          <>
          <ListToolbar
            search={<SearchField value={query} onChange={setQuery} placeholder={t("search")} />}
            filters={[
              {
                key: "show",
                label: t("status"),
                icon: CircleDot,
                value: filter,
                fallback: "all",
                onChange: (v) => setFilter(v as Filter),
                options: [
                  { value: "all", label: tl("all"), count: restaurants.length },
                  { value: "active", label: tc("active"), count: activeCount },
                  { value: "suspended", label: t("suspendedFilter"), count: restaurants.length - activeCount },
                ],
              },
            ]}
            onReset={reset}
            count={<ResultCount shown={visible.length} total={restaurants.length} noun={(n) => t("restaurantsN", { n })} />}
          />
          <div className="bg-surface overflow-hidden rounded-xl border">
            {/* Column heads appear from tablet up; phones read each row as a block. */}
            <div className="text-muted-foreground bg-subtle hidden grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_5rem_6rem_7rem_2.5rem] items-center gap-4 border-b px-5 py-2 text-xs font-medium md:grid">
              <span>
                <SortHeader label={t("name")} column="name" sorting={sorting} />
              </span>
              <span>
                <SortHeader label={t("owner")} column="owner" sorting={sorting} />
              </span>
              <span className="flex justify-end">
                <SortHeader label={t("staffCount")} column="staff" sorting={sorting} />
              </span>
              <span className="flex justify-end">
                <SortHeader label={t("ordersToday")} column="ordersToday" sorting={sorting} />
              </span>
              <span>
                <SortHeader label={t("status")} column="status" sorting={sorting} />
              </span>
              <span className="sr-only">{tc("actions")}</span>
            </div>
            {visible.length === 0 ? (
              <NoMatches onClear={reset} />
            ) : (
            <ul className="divide-y">
              {visible.map((r) => (
                <li
                  key={r.id}
                  className={cn(
                    "hover:bg-subtle relative grid grid-cols-[1fr_auto] transition-colors items-center gap-x-4 gap-y-1.5 px-5 py-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_5rem_6rem_7rem_2.5rem] md:py-3",
                    !r.active && "bg-subtle",
                  )}
                >
                  <span className="flex min-w-0 flex-col">
                    <Link href={`/admin/restaurants/${r.id}`} className="row-link truncate font-medium">
                      {r.name}
                    </Link>
                    <span className="text-muted-foreground truncate text-xs" dir="ltr">
                      /r/{r.slug}
                    </span>
                  </span>
                  <span className="relative z-10 col-start-2 row-start-1 flex items-center gap-2 md:hidden">
                    <Badge variant={r.active ? "active" : "inactive"}>{r.active ? tc("active") : tc("inactive")}</Badge>
                    <RowMenu restaurant={r} onReset={() => setResetting(r)} onToggle={() => setActive(r, !r.active)} />
                  </span>
                  <span className="text-muted-foreground flex min-w-0 flex-wrap gap-x-2 text-sm md:flex-col md:gap-0">
                    <span className="text-foreground truncate">{r.owner?.name ?? "—"}</span>
                    <span className="figure text-xs" dir="ltr">
                      {r.owner?.phone}
                    </span>
                  </span>
                  <span className="text-muted-foreground flex gap-4 text-sm md:contents">
                    <span className="md:text-foreground figure md:text-end">
                      <span className="md:sr-only">{t("staffCount")} </span>
                      {r.staffCount}
                    </span>
                    <span className="md:text-foreground figure font-semibold md:text-end">
                      <span className="font-normal md:sr-only">{t("ordersToday")} </span>
                      {r.ordersToday}
                    </span>
                  </span>
                  <span className="hidden md:block">
                    <Badge variant={r.active ? "active" : "inactive"}>{r.active ? tc("active") : tc("inactive")}</Badge>
                  </span>
                  <span className="relative z-10 hidden justify-end md:flex">
                    <RowMenu restaurant={r} onReset={() => setResetting(r)} onToggle={() => setActive(r, !r.active)} />
                  </span>
                </li>
              ))}
            </ul>
            )}
          </div>
          </>
        )}
      </PageBody>

      <Dialog open={creating} onOpenChange={setCreating}>
        <SheetContent title={t("create")} description={t("createHint")}>
          <form onSubmit={create} className="flex flex-col gap-5">
            <Field id="r-name" label={t("name")}>
              <Input id="r-name" name="name" required maxLength={100} />
            </Field>
            <Field id="r-slug" label={t("slug")} hint={t("slugHint")}>
              <Input
                id="r-slug"
                name="slug"
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                maxLength={60}
                dir="ltr"
                autoComplete="off"
                aria-describedby="r-slug-hint"
              />
            </Field>
            <div className="border-t pt-5">
              <p className="mb-4 text-sm font-semibold">{t("owner")}</p>
              <div className="flex flex-col gap-5">
                <Field id="r-owner" label={t("ownerName")}>
                  <Input id="r-owner" name="ownerName" required maxLength={100} />
                </Field>
                <Field id="r-phone" label={t("ownerPhone")}>
                  <Input id="r-phone" name="ownerPhone" type="tel" required dir="ltr" />
                </Field>
                <Field id="r-password" label={t("ownerPassword")}>
                  <PasswordInput id="r-password" name="ownerPassword" required minLength={8} autoComplete="new-password" />
                </Field>
              </div>
            </div>
            <FormError>{error}</FormError>
            <Button type="submit" size="lg" disabled={pending}>
              {t("create")}
            </Button>
          </form>
        </SheetContent>
      </Dialog>

      <ResetPasswordDialog
        open={resetting !== null}
        onOpenChange={(open) => !open && setResetting(null)}
        title={t("resetPassword")}
        subject={resetting?.owner ? `${resetting.owner.name} · ${resetting.name}` : ""}
        onSave={(password) => resetOwnerPassword(resetting!.owner!.id, password)}
      />
    </>
  );
}

function RowMenu({
  restaurant,
  onReset,
  onToggle,
}: {
  restaurant: AdminRestaurant;
  onReset: () => void;
  onToggle: () => void;
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  return (
    <Menu>
      <MenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={`${tc("actions")}: ${restaurant.name}`} title={tc("actions")} />
        }
      >
        <MoreHorizontal />
      </MenuTrigger>
      <MenuContent>
        <MenuItem render={<Link href={`/r/${restaurant.slug}`} />}>
          <Eye />
          {t("openPage")}
        </MenuItem>
        {restaurant.owner ? (
          <MenuItem onClick={onReset}>
            <KeyRound />
            {t("resetPassword")}
          </MenuItem>
        ) : null}
        <MenuSeparator />
        {restaurant.active ? (
          <MenuItem tone="danger" onClick={onToggle}>
            <Ban />
            {t("suspend")}
          </MenuItem>
        ) : (
          <MenuItem onClick={onToggle}>
            <CircleCheck />
            {t("activate")}
          </MenuItem>
        )}
      </MenuContent>
    </Menu>
  );
}
