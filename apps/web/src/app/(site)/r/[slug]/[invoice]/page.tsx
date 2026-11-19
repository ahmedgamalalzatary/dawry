import type { PublicOrder, PublicRestaurant } from "@dawry/shared";
import { ArrowRight, SearchX } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LiveOrder } from "@/components/customer/live-order";
import { buttonVariants } from "@/components/ui/button";
import { getMe, serverGet } from "@/lib/api/server";

export default async function OrderPage({ params, searchParams }: PageProps<"/r/[slug]/[invoice]">) {
  const { slug, invoice } = await params;
  const { day } = await searchParams;
  const encodedSlug = encodeURIComponent(slug);
  const encodedInvoice = encodeURIComponent(invoice);
  const orderUrl =
    day === undefined
      ? `/api/public/r/${encodedSlug}/orders/${encodedInvoice}`
      : typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day)
        ? `/api/me/orders/${encodedSlug}/${day}/${encodedInvoice}`
        : null;
  const [order, me, t, tc] = await Promise.all([
    orderUrl ? serverGet<PublicOrder>(orderUrl) : null,
    getMe(),
    getTranslations("order"),
    getTranslations("common"),
  ]);

  if (order && orderUrl) {
    const favorites = me?.kind === "customer" ? await serverGet<PublicRestaurant[]>("/api/me/favorites") : null;
    return (
      <LiveOrder
        key={orderUrl}
        initial={order}
        orderUrl={orderUrl}
        signedIn={me?.kind === "customer"}
        favorite={favorites ? favorites.some((f) => f.slug === order.restaurant.slug) : null}
        renderedAt={new Date().toISOString()}
      />
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <span className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-full">
        <SearchX aria-hidden className="size-7" />
      </span>
      <h1 className="text-xl font-semibold text-balance">{t("notFound")}</h1>
      <p className="text-muted-foreground text-sm">
        {t("notFoundHint")} <span className="figure text-foreground font-semibold" dir="ltr">#{invoice}</span>
      </p>
      <Link href={`/r/${encodedSlug}`} className={buttonVariants({ variant: "outline" })}>
        <ArrowRight aria-hidden className="ltr:rotate-180" />
        {tc("tryAgain")}
      </Link>
    </main>
  );
}
