"use client";

import type { StaffMember } from "@dawry/shared";
import { ChevronLeft, KeyRound, MoreHorizontal, Trash2, UserPlus, UsersRound } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageBody, PageHeader } from "@/components/layout/app-shell";
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
import { formatDay } from "@/lib/format";
import { matchesSearch, useParam, useSort } from "@/lib/list";

const SORTS = ["name", "username", "joined"] as const;
type Sort = (typeof SORTS)[number];
const SORTERS: Record<Sort, (a: StaffMember, b: StaffMember) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  username: (a, b) => a.username.localeCompare(b.username),
  joined: (a, b) => a.createdAt.localeCompare(b.createdAt),
};
const GRID = "md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_5rem]";

export function StaffManager({ initial }: { initial: StaffMember[] }) {
  const t = useTranslations("staff");
  const tc = useTranslations("common");
  const [staff, setStaff] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<StaffMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const locale = useLocale();
  const [query, setQuery] = useParam("q", "");
  const sorting = useSort(SORTS, "name");
  const visible = staff
    .filter((m) => matchesSearch(query, m.name, m.username))
    .sort((a, b) => sorting.sign * SORTERS[sorting.column](a, b));
  const joined = (m: StaffMember) => formatDay(m.createdAt.slice(0, 10), locale, { day: "numeric", month: "short", year: "numeric" });

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
      setAdding(false);
      toast.success(t("added"));
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
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button onClick={() => setAdding(true)}>
            <UserPlus aria-hidden />
            {t("add")}
          </Button>
        }
      />
      <PageBody>
        {staff.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
            <UsersRound aria-hidden className="text-muted-foreground size-8" />
            <p className="font-medium">{t("empty")}</p>
            <p className="text-muted-foreground max-w-sm text-sm">{t("emptyHint")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <ListToolbar
              search={<SearchField value={query} onChange={setQuery} placeholder={t("search")} />}
              onReset={() => setQuery("")}
              count={<ResultCount shown={visible.length} total={staff.length} noun={(n) => t("count", { n })} />}
            />
            <div className="bg-surface overflow-hidden rounded-xl border">
              <div className={`text-muted-foreground bg-subtle hidden items-center gap-4 border-b px-5 py-2 text-xs font-medium md:grid ${GRID}`}>
                <span>
                  <SortHeader label={t("cols.name")} column="name" sorting={sorting} />
                </span>
                <span>
                  <SortHeader label={t("cols.username")} column="username" sorting={sorting} />
                </span>
                <span>
                  <SortHeader label={t("cols.joined")} column="joined" sorting={sorting} />
                </span>
                <span className="sr-only">{tc("actions")}</span>
              </div>
              {visible.length === 0 ? (
                <NoMatches onClear={() => setQuery("")} />
              ) : (
                <ul className="divide-y">
                  {visible.map((m) => (
                    <li
                      key={m.id}
                      className={`hover:bg-subtle relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 transition-colors ${GRID}`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span
                          aria-hidden
                          className="bg-muted font-heading flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                        >
                          {m.name.slice(0, 1)}
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <Link href={`/dashboard/staff/${m.id}`} className="row-link truncate font-medium">
                            {m.name}
                          </Link>
                          <span className="text-muted-foreground truncate text-xs md:hidden" dir="ltr">
                            {m.username}
                          </span>
                        </span>
                      </span>
                      <span className="text-muted-foreground hidden truncate text-sm md:block" dir="ltr">
                        {m.username}
                      </span>
                      <span className="text-muted-foreground hidden text-sm md:block">{joined(m)}</span>
                      <span className="relative z-10 col-start-2 row-start-1 flex items-center justify-end gap-1 md:col-start-auto md:row-start-auto">
                        <Menu>
                          <MenuTrigger
                            render={
                              <Button variant="ghost" size="icon-sm" aria-label={`${tc("actions")}: ${m.username}`} title={tc("actions")} />
                            }
                          >
                            <MoreHorizontal />
                          </MenuTrigger>
                          <MenuContent>
                            <MenuItem onClick={() => setResetting(m)}>
                              <KeyRound />
                              {t("resetPassword")}
                            </MenuItem>
                            <MenuSeparator />
                            <MenuItem tone="danger" onClick={() => void remove(m)}>
                              <Trash2 />
                              {`${tc("remove")} ${m.username}`}
                            </MenuItem>
                          </MenuContent>
                        </Menu>
                        <ChevronLeft aria-hidden className="text-muted-foreground size-4 ltr:rotate-180" />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </PageBody>

      <Dialog open={adding} onOpenChange={setAdding}>
        <SheetContent title={t("add")} description={t("addHint")}>
          <form onSubmit={add} className="flex flex-col gap-5">
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
            <Field id="staff-password" label={t("password")} hint={tc("passwordRule")}>
              <PasswordInput id="staff-password" name="password" required minLength={8} autoComplete="new-password" />
            </Field>
            <FormError>{error}</FormError>
            <Button type="submit" size="lg" disabled={pending}>
              {t("add")}
            </Button>
          </form>
        </SheetContent>
      </Dialog>

      <ResetPasswordDialog
        open={resetting !== null}
        onOpenChange={(open) => !open && setResetting(null)}
        title={t("resetPassword")}
        subject={resetting ? `${resetting.name} (${resetting.username})` : ""}
        onSave={(password) => resetPassword(resetting!, password)}
      />
    </>
  );
}
