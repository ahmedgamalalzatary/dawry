import type { RestaurantSettings } from "@dawry/shared";
import { getTranslations } from "next-intl/server";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { requireKind, serverGet } from "@/lib/api/server";

export default async function Page() {
  await requireKind("owner");
  const [t, data] = await Promise.all([getTranslations("settings"), serverGet<RestaurantSettings>("/api/restaurant/settings")]);
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{t("title")}</h2>
      {data ? <SettingsForm initial={data} /> : null}
    </section>
  );
}
