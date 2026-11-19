import type { PublicRestaurant } from "@dawry/shared";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { FavoriteButton } from "@/components/customer/favorite-button";
import { InvoiceForm } from "@/components/customer/invoice-form";
import { getMe, serverGet } from "@/lib/api/server";

export default async function RestaurantPage({ params }: PageProps<"/r/[slug]">) {
  const { slug } = await params;
  const [restaurant, me, t] = await Promise.all([
    serverGet<PublicRestaurant>(`/api/public/r/${encodeURIComponent(slug)}`),
    getMe(),
    getTranslations("restaurant"),
  ]);
  if (!restaurant) notFound();
  const favorites = me ? await serverGet<PublicRestaurant[]>("/api/me/favorites") : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10">
      <header className="flex flex-col items-center gap-3 text-center">
        {restaurant.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- restaurant logos are external URLs
          <img src={restaurant.logoUrl} alt="" className="size-20 rounded-xl object-cover" referrerPolicy="no-referrer" />
        ) : null}
        <h1 className="text-2xl font-bold">{restaurant.name}</h1>
        {me ? (
          <FavoriteButton slug={slug} initial={Boolean(favorites?.some((f) => f.slug === slug))} />
        ) : null}
      </header>
      <InvoiceForm slug={slug} />
      {restaurant.phone ? (
        <a href={`tel:${restaurant.phone}`} className="text-primary text-center text-sm underline">
          {t("call")}
        </a>
      ) : null}
    </main>
  );
}
