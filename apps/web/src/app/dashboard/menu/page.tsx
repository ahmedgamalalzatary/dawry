import type { MenuItem } from "@dawry/shared";
import { getTranslations } from "next-intl/server";
import { PageSection } from "@/components/dashboard/page-section";
import { MenuManager } from "@/components/dashboard/catalog-managers";
import { requireKind, serverGet } from "@/lib/api/server";

export default async function Page() {
  await requireKind("owner");
  const [t, data] = await Promise.all([getTranslations("menu"), serverGet<MenuItem[]>("/api/restaurant/menu")]);
  return (
    <PageSection title={t("title")} description={t("description")}>
      <MenuManager initial={data ?? []} />
    </PageSection>
  );
}
