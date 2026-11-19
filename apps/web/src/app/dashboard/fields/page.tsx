import type { CustomField } from "@dawry/shared";
import { getTranslations } from "next-intl/server";
import { FieldsManager } from "@/components/dashboard/catalog-managers";
import { requireKind, serverGet } from "@/lib/api/server";

export default async function Page() {
  await requireKind("owner");
  const [t, data] = await Promise.all([getTranslations("fields"), serverGet<CustomField[]>("/api/restaurant/fields")]);
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{t("title")}</h2>
      <FieldsManager initial={data ?? []} />
    </section>
  );
}
