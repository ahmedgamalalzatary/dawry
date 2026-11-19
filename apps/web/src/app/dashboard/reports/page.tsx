import type { RestaurantReport } from "@dawry/shared";
import { getTranslations } from "next-intl/server";
import { PageSection } from "@/components/dashboard/page-section";
import { ReportsTable } from "@/components/dashboard/reports-table";
import { requireKind, serverGet } from "@/lib/api/server";

export default async function Page() {
  await requireKind("owner");
  const [t, data] = await Promise.all([getTranslations("reports"), serverGet<RestaurantReport>("/api/restaurant/reports")]);
  return (
    <PageSection title={t("title")} description={t("description")}>
      <ReportsTable report={data ?? { days: [] }} />
    </PageSection>
  );
}
