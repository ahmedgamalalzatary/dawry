"use client";

import type { CustomField, MenuItem } from "@dawry/shared";
import { ChevronLeft, Eye, ListFilter, ListPlus, Pencil, Plus, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { PageBody, PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ListToolbar, NoMatches, ResultCount, SearchField, SortHeader } from "@/components/ui/list-toolbar";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api/client";
import { ApiRequestError } from "@/lib/api/errors";
import { matchesSearch, useParam, useSort } from "@/lib/list";
import { cn } from "@/lib/utils";

function useSaver() {
  const tc = useTranslations("common");
  return async <T,>(request: Promise<T>): Promise<T | null> => {
    try {
      return await request;
    } catch (err) {
      toast.error(err instanceof ApiRequestError && err.status === 400 ? err.message : tc("error"));
      return null;
    }
  };
}

function EmptyState({ icon, title, hint, action }: { icon: ReactNode; title: string; hint: string; action: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
      {icon}
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground max-w-sm text-sm">{hint}</p>
      {action}
    </div>
  );
}

// ---- Menu --------------------------------------------------------------------

const MENU_FILTERS = ["all", "active", "inactive"] as const;
type MenuFilter = (typeof MENU_FILTERS)[number];

export function MenuManager({ initial }: { initial: MenuItem[] }) {
  const t = useTranslations("menu");
  const tl = useTranslations("list");
  const save = useSaver();
  const [items, setItems] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useParam("q", "");
  const [filter, setFilter] = useParam<MenuFilter>("show", "all", MENU_FILTERS);
  const sorting = useSort(["name", "status"] as const, "name");

  const activeCount = items.filter((i) => i.active).length;
  const visible = items
    .filter((i) => filter === "all" || (filter === "active") === i.active)
    .filter((i) => matchesSearch(query, i.name))
    .sort(
      (a, b) =>
        sorting.sign *
        (sorting.column === "status"
          ? Number(b.active) - Number(a.active) || a.name.localeCompare(b.name)
          : a.name.localeCompare(b.name)),
    );
  const reset = () => {
    setQuery("");
    setFilter("all");
  };

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const name = String(new FormData(formElement).get("name")).trim();
    const created = await save(api<MenuItem>("/api/restaurant/menu", { body: { name } }));
    if (created) {
      setItems((list) => [...list, created]);
      formElement.reset();
      toast.success(t("added", { name: created.name }));
      // The sheet stays open: menus are usually entered several items at a time.
      formElement.querySelector("input")?.focus();
    }
  }

  async function toggle(item: MenuItem, active: boolean) {
    const updated = await save(api<MenuItem>(`/api/restaurant/menu/${item.id}`, { method: "PATCH", body: { active } }));
    if (updated) setItems((list) => list.map((i) => (i.id === item.id ? updated : i)));
  }

  const addButton = (
    <Button onClick={() => setAdding(true)}>
      <Plus aria-hidden />
      {t("add")}
    </Button>
  );

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} actions={addButton} />
      <PageBody className="flex flex-col gap-4">
        {items.length === 0 ? (
          <EmptyState
            icon={<UtensilsCrossed aria-hidden className="text-muted-foreground size-8" />}
            title={t("empty")}
            hint={t("emptyHint")}
            action={addButton}
          />
        ) : (
          <>
            <ListToolbar
              search={<SearchField value={query} onChange={setQuery} placeholder={t("search")} />}
              filters={[
                {
                  key: "show",
                  label: tl("status"),
                  icon: Eye,
                  value: filter,
                  fallback: "all",
                  onChange: (v) => setFilter(v as MenuFilter),
                  options: [
                    { value: "all", label: tl("all"), count: items.length },
                    { value: "active", label: t("onMenu"), count: activeCount },
                    { value: "inactive", label: t("hidden"), count: items.length - activeCount },
                  ],
                },
              ]}
              onReset={reset}
              count={<ResultCount shown={visible.length} total={items.length} noun={(n) => t("itemsN", { n })} />}
            />
            <div className="bg-surface overflow-hidden rounded-xl border">
              <div className="text-muted-foreground bg-subtle flex items-center gap-3 border-b px-5 py-2 text-xs font-medium">
                <span className="flex-1">
                  <SortHeader label={t("name")} column="name" sorting={sorting} />
                </span>
                <SortHeader label={t("onMenu")} column="status" sorting={sorting} className="me-5" />
              </div>
              {visible.length === 0 ? (
                <NoMatches onClear={reset} />
              ) : (
                <ul className="divide-y">
                  {visible.map((item) => (
                    <li key={item.id} className="hover:bg-subtle relative flex min-h-14 items-center gap-3 px-5 py-2 transition-colors">
                      <Link
                        href={`/dashboard/menu/${item.id}`}
                        className={cn("row-link min-w-0 flex-1 truncate font-medium", !item.active && "text-muted-foreground")}
                      >
                        {item.name}
                      </Link>
                      {item.active ? null : <Badge variant="inactive">{t("hidden")}</Badge>}
                      <label className="text-muted-foreground relative z-10 flex cursor-pointer items-center gap-2.5 text-xs">
                        <span className="max-sm:sr-only">{t("onMenu")}</span>
                        <Switch checked={item.active} onCheckedChange={(checked) => toggle(item, checked)} aria-label={`${t("onMenu")}: ${item.name}`} />
                      </label>
                      <ChevronLeft aria-hidden className="text-muted-foreground size-4 shrink-0 ltr:rotate-180" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </PageBody>

      <Dialog open={adding} onOpenChange={setAdding}>
        <SheetContent title={t("add")} description={t("addHint")}>
          <form onSubmit={add} className="flex flex-col gap-5">
            <Field id="menu-name" label={t("name")}>
              <Input id="menu-name" name="name" required maxLength={100} placeholder={t("namePlaceholder")} autoFocus />
            </Field>
            <Button type="submit" size="lg">
              <Plus aria-hidden />
              {t("add")}
            </Button>
          </form>
        </SheetContent>
      </Dialog>
    </>
  );
}

// ---- Custom fields -----------------------------------------------------------

const FLAGS = ["required", "public", "active"] as const;
const FIELD_FILTERS = ["all", "required", "public", "inactive"] as const;
type FieldFilter = (typeof FIELD_FILTERS)[number];

const IN_FIELD_FILTER: Record<FieldFilter, (f: CustomField) => boolean> = {
  all: () => true,
  required: (f) => f.required,
  public: (f) => f.public,
  inactive: (f) => !f.active,
};

export function FieldsManager({ initial }: { initial: CustomField[] }) {
  const t = useTranslations("fields");
  const tc = useTranslations("common");
  const tl = useTranslations("list");
  const save = useSaver();
  const [fields, setFields] = useState(initial);
  const [editing, setEditing] = useState<CustomField | "new" | null>(null);
  const [query, setQuery] = useParam("q", "");
  const [filter, setFilter] = useParam<FieldFilter>("show", "all", FIELD_FILTERS);
  const sorting = useSort(["order", "label"] as const, "order");
  const flagLabel = (key: (typeof FLAGS)[number]) => (key === "active" ? tc("active") : t(key));

  const visible = fields
    .filter(IN_FIELD_FILTER[filter])
    .filter((f) => matchesSearch(query, f.label))
    .sort((a, b) => (sorting.column === "order" ? 0 : sorting.sign * a.label.localeCompare(b.label)));
  if (sorting.column === "order" && sorting.dir === "desc") visible.reverse();
  const reset = () => {
    setQuery("");
    setFilter("all");
  };

  async function update(field: CustomField, patch: Partial<CustomField>) {
    const updated = await save(api<CustomField>(`/api/restaurant/fields/${field.id}`, { method: "PATCH", body: patch }));
    if (updated) setFields((list) => list.map((f) => (f.id === field.id ? updated : f)));
    return updated;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = {
      label: String(form.get("label")).trim(),
      required: form.get("required") === "on",
      public: form.get("public") === "on",
    };
    if (editing === "new") {
      const created = await save(api<CustomField>("/api/restaurant/fields", { body: values }));
      if (created) {
        setFields((list) => [...list, created]);
        toast.success(t("added"));
        setEditing(null);
      }
    } else if (editing) {
      const updated = await update(editing, { ...values, active: form.get("active") === "on" });
      if (updated) {
        toast.success(tc("saved"));
        setEditing(null);
      }
    }
  }

  const addButton = (
    <Button onClick={() => setEditing("new")}>
      <Plus aria-hidden />
      {t("add")}
    </Button>
  );
  const current = editing && editing !== "new" ? editing : null;

  return (
    <>
      <PageHeader title={t("title")} description={t("hint")} actions={addButton} />
      <PageBody className="flex flex-col gap-4">
        {fields.length === 0 ? (
          <EmptyState
            icon={<ListPlus aria-hidden className="text-muted-foreground size-8" />}
            title={t("empty")}
            hint={t("emptyHint")}
            action={addButton}
          />
        ) : (
          <>
            <ListToolbar
              search={<SearchField value={query} onChange={setQuery} placeholder={t("search")} />}
              filters={[
                {
                  key: "show",
                  label: tl("show"),
                  icon: ListFilter,
                  value: filter,
                  fallback: "all",
                  onChange: (v) => setFilter(v as FieldFilter),
                  options: FIELD_FILTERS.map((f) => ({
                    value: f,
                    label: f === "all" ? tl("all") : f === "inactive" ? tc("inactive") : t(f),
                    count: fields.filter(IN_FIELD_FILTER[f]).length,
                  })),
                },
              ]}
              onReset={reset}
              count={<ResultCount shown={visible.length} total={fields.length} noun={(n) => t("fieldsN", { n })} />}
            />
            <div className="bg-surface overflow-hidden rounded-xl border">
              <div className="text-muted-foreground bg-subtle hidden grid-cols-[1fr_repeat(3,6.5rem)_2.5rem] items-center gap-4 border-b px-5 py-2 text-xs font-medium sm:grid">
                <span>
                  <SortHeader label={t("label")} column="label" sorting={sorting} />
                </span>
                {FLAGS.map((key) => (
                  <span key={key} className="text-center">
                    {flagLabel(key)}
                  </span>
                ))}
                <span />
              </div>
              {visible.length === 0 ? (
                <NoMatches onClear={reset} />
              ) : (
                <ul className="divide-y">
                  {visible.map((field) => (
                    <li
                      key={field.id}
                      className="hover:bg-subtle relative grid grid-cols-[1fr_auto] gap-3 px-5 py-3.5 transition-colors sm:grid-cols-[1fr_repeat(3,6.5rem)_2.5rem] sm:items-center sm:gap-4"
                    >
                      <button
                        type="button"
                        onClick={() => setEditing(field)}
                        className={cn(
                          "row-link cursor-pointer text-start font-medium",
                          !field.active && "text-muted-foreground line-through",
                        )}
                      >
                        {field.label}
                      </button>
                      <Pencil aria-hidden className="text-muted-foreground size-4 sm:hidden" />
                      <span className="col-span-2 flex flex-wrap gap-x-6 gap-y-2 sm:contents">
                        {FLAGS.map((key) => (
                          <label
                            key={key}
                            className="text-muted-foreground relative z-10 flex cursor-pointer items-center gap-2 text-sm sm:justify-center"
                          >
                            <span className="sm:sr-only">{flagLabel(key)}</span>
                            <Switch
                              checked={field[key]}
                              onCheckedChange={(checked) => void update(field, { [key]: checked })}
                              aria-label={`${field.label}: ${flagLabel(key)}`}
                            />
                          </label>
                        ))}
                      </span>
                      <Pencil aria-hidden className="text-muted-foreground hidden size-4 justify-self-end sm:block" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </PageBody>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent title={current ? t("edit") : t("add")} description={t("addHint")}>
          <form key={current?.id ?? "new"} onSubmit={submit} className="flex flex-col gap-5">
            <Field id="field-label" label={t("label")}>
              <Input
                id="field-label"
                name="label"
                required
                maxLength={100}
                defaultValue={current?.label}
                placeholder={t("labelPlaceholder")}
                autoFocus
              />
            </Field>
            <fieldset className="flex flex-col divide-y rounded-xl border">
              <legend className="sr-only">{t("options")}</legend>
              {(current ? FLAGS : (["required", "public"] as const)).map((key) => (
                <label key={key} className="flex cursor-pointer items-start justify-between gap-4 px-4 py-3.5">
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{flagLabel(key)}</span>
                    <span className="text-muted-foreground text-xs">{t(`${key}Hint`)}</span>
                  </span>
                  <input
                    type="checkbox"
                    name={key}
                    defaultChecked={current ? current[key] : false}
                    className="accent-primary mt-1 size-4 shrink-0 cursor-pointer"
                  />
                </label>
              ))}
            </fieldset>
            <Button type="submit" size="lg">
              {current ? tc("save") : t("add")}
            </Button>
          </form>
        </SheetContent>
      </Dialog>
    </>
  );
}
