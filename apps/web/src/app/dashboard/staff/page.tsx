import type { StaffMember } from "@dawry/shared";
import { getTranslations } from "next-intl/server";
import { StaffManager } from "@/components/dashboard/staff-manager";
import { requireKind, serverGet } from "@/lib/api/server";

export default async function Page() {
  await requireKind("owner");
  const [t, data] = await Promise.all([getTranslations("staff"), serverGet<StaffMember[]>("/api/restaurant/staff")]);
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{t("title")}</h2>
      <StaffManager initial={data ?? []} />
    </section>
  );
}
