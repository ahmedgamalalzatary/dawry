"use client";

import type { AdminRestaurantDetail } from "@dawry/shared";
import { Ban, CircleCheck, Eye, FileBarChart, KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { RestaurantAvatar } from "@/components/customer/restaurant-avatar";
import { PageBody, PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ResetPasswordDialog } from "@/components/ui/reset-password-dialog";
import { Facts, Panel } from "@/components/ui/stats";
import { api } from "@/lib/api/client";
import { formatPercent } from "@/lib/format";
import { ApiRequestError } from "@/lib/api/errors";

export function AdminRestaurantDetailView({ detail }: { detail: AdminRestaurantDetail }) {
  const t = useTranslations("admin");
  const tr = useTranslations("report");
  const trp = useTranslations("rp");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [active, setActive] = useState(detail.restaurant.active);
  const [resetting, setResetting] = useState(false);
  const { restaurant, staff, report } = detail;
  const date = (iso: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { dateStyle: "medium" }).format(new Date(iso));

  async function toggle() {
    try {
      await api(`/api/admin/restaurants/${restaurant.id}`, { method: "PATCH", body: { active: !active } });
      setActive(!active);
      toast.success(active ? t("suspended") : t("activated"));
      router.refresh();
    } catch {
      toast.error(tc("error"));
    }
  }

  return (
    <>
      <PageHeader
        back={{ href: "/admin/restaurants", label: t("nav.restaurants") }}
        title={
          <span className="flex items-center gap-3">
            <RestaurantAvatar name={restaurant.name} logoUrl={restaurant.logoUrl || null} className="size-9 text-sm" />
            {restaurant.name}
          </span>
        }
        meta={<Badge variant={active ? "active" : "inactive"}>{active ? tc("active") : t("suspendedFilter")}</Badge>}
        description={
          <span className="figure" dir="ltr">
            /r/{restaurant.slug}
          </span>
        }
        actions={
          <>
            <Link href={`/r/${restaurant.slug}`} className={buttonVariants({ variant: "outline" })}>
              <Eye aria-hidden />
              {t("openPage")}
            </Link>
            {restaurant.owner ? (
              <Button variant="outline" onClick={() => setResetting(true)}>
                <KeyRound aria-hidden />
                {t("resetPassword")}
              </Button>
            ) : null}
            {active ? (
              <Button variant="destructive" onClick={() => void toggle()}>
                <Ban aria-hidden />
                {t("suspend")}
              </Button>
            ) : (
              <Button variant="go" onClick={() => void toggle()}>
                <CircleCheck aria-hidden />
                {t("activate")}
              </Button>
            )}
          </>
        }
      />
      <PageBody className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label={t("performance")} className="flex min-w-0 flex-col gap-4">
          <Panel
            title={t("performance")}
            description={tr("lastDays", { n: report.range.days })}
            actions={
              <Link href={`/admin/reports?view=daily&place=${restaurant.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <FileBarChart aria-hidden />
                {trp("openFull")}
              </Link>
            }
            flush
          >
            <Facts
              rows={[
                { label: trp("sum.orders"), value: <span className="figure">{report.totals.orders}</span> },
                { label: trp("sum.delivered"), value: <span className="figure">{report.totals.delivered}</span> },
                { label: trp("sum.cancelled"), value: <span className="figure">{report.totals.cancelled}</span> },
                { label: trp("sum.late"), value: <span className="figure">{report.totals.late}</span> },
                { label: trp("sum.onTime"), value: <span className="figure">{formatPercent(report.totals.onTimeRate)}</span> },
                {
                  label: trp("sum.avgPrep"),
                  value: report.totals.avgPrepMinutes === null ? "—" : trp("minutes", { n: report.totals.avgPrepMinutes }),
                },
                { label: t("staffCount"), value: <span className="figure">{staff.length}</span> },
              ]}
            />
          </Panel>
        </section>

        <div className="flex min-w-0 flex-col gap-6">
          <Panel title={t("details")} flush>
            <Facts
              rows={[
                { label: t("owner"), value: restaurant.owner?.name ?? "—" },
                {
                  label: t("ownerPhone"),
                  value: restaurant.owner ? (
                    <span className="figure" dir="ltr">
                      {restaurant.owner.phone}
                    </span>
                  ) : (
                    "—"
                  ),
                },
                {
                  label: t("restaurantPhone"),
                  value: restaurant.phone ? (
                    <span className="figure" dir="ltr">
                      {restaurant.phone}
                    </span>
                  ) : (
                    "—"
                  ),
                },
                { label: t("ordersToday"), value: <span className="figure">{restaurant.ordersToday}</span> },
                { label: t("joined"), value: date(restaurant.createdAt) },
              ]}
            />
          </Panel>
          <Panel title={t("staffCount")} description={t("staffN", { n: staff.length })} flush>
            {staff.length === 0 ? (
              <p className="text-muted-foreground px-5 py-6 text-sm">{t("noStaff")}</p>
            ) : (
              <ul className="divide-y">
                {staff.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                    <span
                      aria-hidden
                      className="bg-muted font-heading flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                    >
                      {m.name.slice(0, 1)}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">{m.name}</span>
                      <span className="figure text-muted-foreground truncate text-xs" dir="ltr">
                        {m.username}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </PageBody>

      <ResetPasswordDialog
        open={resetting}
        onOpenChange={setResetting}
        title={t("resetPassword")}
        subject={restaurant.owner ? `${restaurant.owner.name} · ${restaurant.name}` : ""}
        onSave={async (password) => {
          try {
            await api(`/api/admin/users/${restaurant.owner!.id}/password`, { body: { password } });
            toast.success(tc("saved"));
          } catch (err) {
            throw new Error(err instanceof ApiRequestError ? err.message : tc("error"));
          }
        }}
      />
    </>
  );
}
