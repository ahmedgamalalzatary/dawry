import type { PublicOrder } from "@dawry/shared";
import { ArrowRight, SearchX } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LiveOrder } from "@/components/customer/live-order";
import { buttonVariants } from "@/components/ui/button";
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
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 pt-6 pb-12">
      {order ? (
        <LiveOrder initial={order} signedIn={Boolean(me)} renderedAt={new Date().toISOString()} />
      ) : (
        <div className="bg-card flex flex-col items-center gap-4 rounded-3xl border border-dashed px-6 py-12 text-center">
          <span className="bg-muted text-muted-foreground flex size-16 items-center justify-center rounded-full">
            <SearchX aria-hidden className="size-8" />
          </span>
          <p className="text-lg font-semibold text-balance">{t("notFound")}</p>
          <p className="text-muted-foreground text-sm" dir="ltr">
            #{invoice}
          </p>
          <Link href={`/r/${encodeURIComponent(slug)}`} className={buttonVariants({ variant: "outline" })}>
            <ArrowRight aria-hidden className="ltr:rotate-180" />
            {tc("back")}
          </Link>
        </div>
      )}
    </main>
  );
}
