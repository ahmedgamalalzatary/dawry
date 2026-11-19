"use client";

import type { StaffMemberDetail } from "@dawry/shared";
import { KeyRound, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { PageBody, PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ResetPasswordDialog } from "@/components/ui/reset-password-dialog";
import { Panel, StatStrip } from "@/components/ui/stats";
import { api } from "@/lib/api/client";
import { ApiRequestError } from "@/lib/api/errors";
import { formatPercent } from "@/lib/format";
import { OrderSummaryList } from "./order-summary-list";

export function StaffDetail({ detail }: { detail: StaffMemberDetail }) {
  const t = useTranslations("staff");
  const tp = useTranslations("staffPage");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [resetting, setResetting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const { member, stats, recent } = detail;
  const isOwner = member.role === "owner";
  const since = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { dateStyle: "long" }).format(
    new Date(member.createdAt),
  );

  async function remove() {
    try {
      await api(`/api/restaurant/staff/${member.id}`, { method: "DELETE" });
      toast.success(t("removed"));
      router.replace("/dashboard/staff");
      router.refresh();
    } catch {
      toast.error(tc("error"));
    }
  }

  return (
    <>
      <PageHeader
        back={{ href: "/dashboard/staff", label: t("title") }}
        title={member.name}
        meta={<Badge variant="neutral">{isOwner ? tp("owner") : tp("staff")}</Badge>}
        description={
          <>
            <span className="figure" dir="ltr">
              {member.username}
            </span>
            {" · "}
            {tp("since", { date: since })}
          </>
        }
        actions={
          isOwner ? null : (
            <>
              <Button variant="outline" onClick={() => setResetting(true)}>
                <KeyRound aria-hidden />
                {t("resetPassword")}
              </Button>
              <Button variant="destructive" onClick={() => setRemoving(true)}>
                <Trash2 aria-hidden />
                {tc("remove")}
              </Button>
            </>
          )
        }
      />
      <PageBody className="flex flex-col gap-6">
        <StatStrip
          items={[
            { label: tp("orders30"), value: stats.orders },
            { label: tp("delivered"), value: stats.delivered },
            { label: tp("cancelled"), value: stats.cancelled, tone: stats.cancelled > 0 ? "late" : undefined },
            { label: tp("onTime"), value: formatPercent(stats.onTimeRate) },
            { label: tp("avgPrep"), value: stats.avgPrepMinutes === null ? "—" : tp("minutes", { n: stats.avgPrepMinutes }) },
          ]}
        />
        <Panel title={tp("recent")} description={tp("recentHint")} flush>
          <OrderSummaryList orders={recent} empty={tp("noOrders")} hrefFor={(o) => `/dashboard/orders/${o.id}`} />
        </Panel>
      </PageBody>

      <ResetPasswordDialog
        open={resetting}
        onOpenChange={setResetting}
        title={t("resetPassword")}
        subject={`${member.name} (${member.username})`}
        onSave={async (password) => {
          try {
            await api(`/api/restaurant/staff/${member.id}/password`, { body: { password } });
            toast.success(tc("saved"));
          } catch (err) {
            throw new Error(err instanceof ApiRequestError ? err.message : tc("error"));
          }
        }}
      />

      <Dialog open={removing} onOpenChange={setRemoving}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tp("removeTitle", { name: member.name })}</DialogTitle>
            <DialogDescription>{tp("removeHint")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{tc("cancel")}</DialogClose>
            <Button variant="destructive-solid" onClick={() => void remove()}>
              <Trash2 aria-hidden />
              {tc("remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
