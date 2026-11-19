import type { CustomField } from "@dawry/shared";
import { FieldsManager } from "@/components/dashboard/catalog-managers";
import { requireKind, serverGet } from "@/lib/api/server";

export default async function Page() {
  await requireKind("owner");
  const data = await serverGet<CustomField[]>("/api/restaurant/fields");
  return <FieldsManager initial={data ?? []} />;
}
