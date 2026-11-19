import { businessDay, DEFAULT_TIME_ZONE, type ReportData } from "@dawry/shared";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ReportPage } from "@/components/reports/report-page";
import { requireKind, serverGet } from "@/lib/api/server";
import { resolvePeriod } from "@/lib/reports";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("rp"))("title") };
}

export default async function Page({ searchParams }: PageProps<"/dashboard/reports">) {
  const me = await requireKind("owner");
  const { from, to } = resolvePeriod(await searchParams, businessDay(new Date(), DEFAULT_TIME_ZONE));
  const data = await serverGet<ReportData>(`/api/restaurant/reports/data?from=${from}&to=${to}`);
  if (!data) return null;
  return <ReportPage data={data} scope="restaurant" subject={me.restaurant?.name ?? ""} />;
}
