import { businessDay, DEFAULT_TIME_ZONE, type ReportData } from "@dawry/shared";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ReportPage } from "@/components/reports/report-page";
import { requireKind, serverGet } from "@/lib/api/server";
import { resolvePeriod } from "@/lib/reports";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("admin"))("nav.reports") };
}

export default async function AdminReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  await requireKind("admin");
  const { from, to } = resolvePeriod(await searchParams, businessDay(new Date(), DEFAULT_TIME_ZONE));
  const [t, data] = await Promise.all([
    getTranslations("rp"),
    serverGet<ReportData>(`/api/admin/reports/data?from=${from}&to=${to}`),
  ]);
  if (!data) return null;
  return <ReportPage data={data} scope="platform" subject={t("platform")} />;
}
