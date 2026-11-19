import type { StaffMemberDetail } from "@dawry/shared";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StaffDetail } from "@/components/dashboard/staff-detail";
import { requireKind, serverGet } from "@/lib/api/server";

const load = (id: string) => serverGet<StaffMemberDetail>(`/api/restaurant/staff/${encodeURIComponent(id)}`);

export async function generateMetadata({ params }: PageProps<"/dashboard/staff/[id]">): Promise<Metadata> {
  const detail = await load((await params).id);
  return detail ? { title: detail.member.name } : {};
}

export default async function StaffMemberPage({ params }: PageProps<"/dashboard/staff/[id]">) {
  await requireKind("owner");
  const detail = await load((await params).id);
  if (!detail) notFound();
  return <StaffDetail detail={detail} />;
}
