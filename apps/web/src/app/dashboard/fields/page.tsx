import type { CustomField } from "@dawry/shared";
import { getTranslations } from "next-intl/server";
import { PageSection } from "@/components/dashboard/page-section";
import { FieldsManager } from "@/components/dashboard/catalog-managers";
import { requireKind, serverGet } from "@/lib/api/server";

export default async function Page() {
  await requireKind("owner");
  const [t, data] = await Promise.all([getTranslations("fields"), serverGet<CustomField[]>("/api/restaurant/fields")]);
  return (
    <PageSection title={t("title")} description={t("hint")}>
      <FieldsManager initial={data ?? []} />
    </PageSection>
  );
}
