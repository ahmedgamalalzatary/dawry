import type { RestaurantSettings } from "@dawry/shared";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { requireKind, serverGet } from "@/lib/api/server";

export default async function Page() {
  await requireKind("owner");
  const data = await serverGet<RestaurantSettings>("/api/restaurant/settings");
  return data ? <SettingsForm initial={data} /> : null;
}
