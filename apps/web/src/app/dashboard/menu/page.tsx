import type { MenuItem } from "@dawry/shared";
import { MenuManager } from "@/components/dashboard/catalog-managers";
import { requireKind, serverGet } from "@/lib/api/server";

export default async function Page() {
  await requireKind("owner");
  const data = await serverGet<MenuItem[]>("/api/restaurant/menu");
  return <MenuManager initial={data ?? []} />;
}
