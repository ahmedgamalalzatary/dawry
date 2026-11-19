import type { PublicRestaurant } from "@dawry/shared";
import { Phone } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { FavoriteButton } from "@/components/customer/favorite-button";
import { InvoiceForm } from "@/components/customer/invoice-form";
import { RestaurantAvatar } from "@/components/customer/restaurant-avatar";
import { buttonVariants } from "@/components/ui/button";
import { getMe, serverGet } from "@/lib/api/server";
import { cn } from "@/lib/utils";

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
    <main className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 pt-10 pb-12">
      <header className="flex flex-col items-center gap-4 text-center">
        <RestaurantAvatar
          name={restaurant.name}
          logoUrl={restaurant.logoUrl}
          className="size-20 rounded-2xl text-3xl"
        />
        <h1 className="text-3xl font-bold tracking-tight">{restaurant.name}</h1>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {me ? (
            <FavoriteButton slug={slug} initial={Boolean(favorites?.some((f) => f.slug === slug))} />
          ) : null}
          {restaurant.phone ? (
            <a
              href={`tel:${restaurant.phone}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <Phone aria-hidden />
              {t("call")}
            </a>
          ) : null}
        </div>
      </header>
      <InvoiceForm slug={slug} />
    </main>
  );
}
