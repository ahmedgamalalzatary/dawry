import type { StaffMember } from "@dawry/shared";
import { StaffManager } from "@/components/dashboard/staff-manager";
import { requireKind, serverGet } from "@/lib/api/server";

export default async function Page() {
  await requireKind("owner");
  const data = await serverGet<StaffMember[]>("/api/restaurant/staff");
  return <StaffManager initial={data ?? []} />;
}
