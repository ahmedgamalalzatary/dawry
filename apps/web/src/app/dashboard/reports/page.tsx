import type { RestaurantReport } from "@dawry/shared";
import { getTranslations } from "next-intl/server";
import { ReportsTable } from "@/components/dashboard/reports-table";
import { requireKind, serverGet } from "@/lib/api/server";

export default async function Page() {
  await requireKind("owner");
  const [t, data] = await Promise.all([getTranslations("reports"), serverGet<RestaurantReport>("/api/restaurant/reports")]);
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{t("title")}</h2>
      <ReportsTable report={data ?? { days: [] }} />
    </section>
  );
}
