import type { PublicOrder } from "@dawry/shared";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LiveOrder } from "@/components/customer/live-order";
import { getMe, serverGet } from "@/lib/api/server";

export default async function OrderPage({ params }: PageProps<"/r/[slug]/[invoice]">) {
  const { slug, invoice } = await params;
  // Opening the page while signed in saves the order to the account (API side).
  const [order, me, t, tc] = await Promise.all([
    serverGet<PublicOrder>(
      `/api/public/r/${encodeURIComponent(slug)}/orders/${encodeURIComponent(invoice)}`,
    ),
    getMe(),
    getTranslations("order"),
    getTranslations("common"),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      {order ? (
        <LiveOrder initial={order} signedIn={Boolean(me)} renderedAt={new Date().toISOString()} />
      ) : (
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg">{t("notFound")}</p>
          <Link href={`/r/${encodeURIComponent(slug)}`} className="text-primary underline">
            {tc("back")}
          </Link>
        </div>
      )}
    </main>
  );
}
