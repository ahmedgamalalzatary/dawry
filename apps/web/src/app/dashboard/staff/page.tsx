import type { StaffMember } from "@dawry/shared";
import { getTranslations } from "next-intl/server";
import { PageSection } from "@/components/dashboard/page-section";
import { StaffManager } from "@/components/dashboard/staff-manager";
import { requireKind, serverGet } from "@/lib/api/server";

export default async function Page() {
  await requireKind("owner");
  const [t, data] = await Promise.all([getTranslations("staff"), serverGet<StaffMember[]>("/api/restaurant/staff")]);
  return (
    <PageSection title={t("title")} description={t("description")}>
      <StaffManager initial={data ?? []} />
    </PageSection>
  );
}
