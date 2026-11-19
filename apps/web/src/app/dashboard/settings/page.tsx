import type { RestaurantSettings } from "@dawry/shared";
import { getTranslations } from "next-intl/server";
import { PageSection } from "@/components/dashboard/page-section";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { requireKind, serverGet } from "@/lib/api/server";

export default async function Page() {
  await requireKind("owner");
  const [t, data] = await Promise.all([getTranslations("settings"), serverGet<RestaurantSettings>("/api/restaurant/settings")]);
  return (
    <PageSection title={t("title")} description={t("description")}>
      {data ? <SettingsForm initial={data} /> : null}
    </PageSection>
  );
}
