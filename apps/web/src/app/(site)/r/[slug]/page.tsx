import type { PublicRestaurant } from "@dawry/shared";
import { Phone, Star } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { FavoriteButton } from "@/components/customer/favorite-button";
import { InvoiceForm } from "@/components/customer/invoice-form";
import { RestaurantAvatar } from "@/components/customer/restaurant-avatar";
import { getMe, serverGet } from "@/lib/api/server";

export async function generateMetadata({ params }: PageProps<"/r/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await serverGet<PublicRestaurant>(`/api/public/r/${encodeURIComponent(slug)}`);
  return restaurant ? { title: restaurant.name } : {};
}

export default async function RestaurantPage({ params }: PageProps<"/r/[slug]">) {
  const { slug } = await params;
  const [restaurant, me, t] = await Promise.all([
    serverGet<PublicRestaurant>(`/api/public/r/${encodeURIComponent(slug)}`),
    getMe(),
    getTranslations("restaurant"),
  ]);
  if (!restaurant) notFound();
  const customer = me?.kind === "customer";
  const favorites = customer ? await serverGet<PublicRestaurant[]>("/api/me/favorites") : null;

  return (
    <main className="flex flex-1 flex-col">
      <section className="bg-board text-board-foreground">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pt-8 pb-20 sm:px-6 sm:pt-12">
          <div className="flex items-center gap-4">
            <RestaurantAvatar
              name={restaurant.name}
              logoUrl={restaurant.logoUrl}
              className="bg-board-raised size-14 rounded-xl text-xl"
            />
            <h1 className="min-w-0 flex-1 text-[1.75rem] leading-tight font-semibold tracking-tight">{restaurant.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {customer ? (
              <FavoriteButton slug={slug} initial={Boolean(favorites?.some((f) => f.slug === slug))} />
            ) : !me ? (
              <Link
                href="/login"
                className="border-board-line bg-board-raised/60 hover:bg-board-raised inline-flex h-9 items-center gap-2 rounded-lg border px-3.5 text-sm font-medium transition-colors"
              >
                <Star aria-hidden className="size-4" />
                {t("signInToSave")}
              </Link>
            ) : null}
            {restaurant.phone ? (
              <a
                href={`tel:${restaurant.phone}`}
                className="border-board-line bg-board-raised/60 hover:bg-board-raised inline-flex h-9 items-center gap-2 rounded-lg border px-3.5 text-sm font-medium transition-colors"
              >
                <Phone aria-hidden className="size-4" />
                {t("call")}
              </a>
            ) : null}
          </div>
        </div>
      </section>
      <div className="mx-auto -mt-12 w-full max-w-lg px-4 pb-12 sm:px-6">
        <InvoiceForm slug={slug} />
      </div>
    </main>
  );
}
