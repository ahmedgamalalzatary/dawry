"use client";

import type { PublicRestaurant } from "@dawry/shared";
import { ChevronLeft, Search } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { FavoriteStar } from "./favorite-button";
import { RestaurantAvatar } from "./restaurant-avatar";

/** The search field (it straddles the board's lower edge) and the results under it. */
export function RestaurantSearch({
  initial,
  favorites = null,
}: {
  initial: PublicRestaurant[];
  /** The customer's favourites; null for guests and staff (no stars). */
  favorites?: PublicRestaurant[] | null;
}) {
  const saved = favorites ? favorites.map((f) => f.slug) : null;
  const t = useTranslations("home");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(initial);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setResults(await api<PublicRestaurant[]>(`/api/public/restaurants?q=${encodeURIComponent(query)}`));
      } catch {
        // keep the previous results
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="flex flex-col gap-8">
      <div className="bg-surface shadow-raise focus-within:border-ring focus-within:ring-ring/20 relative flex items-center rounded-xl border transition-[border-color,box-shadow] focus-within:ring-4">
        <Search aria-hidden className="text-muted-foreground pointer-events-none absolute start-4 size-5" />
        <input
          type="search"
          aria-label={t("search")}
          placeholder={t("search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="placeholder:text-muted-foreground/80 h-14 w-full rounded-xl bg-transparent ps-12 pe-4 text-base outline-none"
        />
      </div>
      {!query && favorites && favorites.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">{t("favorites")}</h2>
          <RestaurantList restaurants={favorites} favorites={saved} />
        </section>
      ) : null}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">{query ? t("results") : t("all")}</h2>
        {results.length === 0 ? (
          <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-10 text-center text-sm">
            {t("noResults")}
          </p>
        ) : (
          <RestaurantList restaurants={results} favorites={saved} />
        )}
      </section>
    </div>
  );
}

/** Restaurants as rows; with `favorites` (the saved slugs) each row gets a star to save it. */
export function RestaurantList({
  restaurants,
  favorites = null,
}: {
  restaurants: PublicRestaurant[];
  favorites?: string[] | null;
}) {
  return (
    <ul className="bg-surface divide-y overflow-hidden rounded-xl border">
      {restaurants.map((r) => (
        <li key={r.slug} className="group hover:bg-subtle relative flex items-center gap-3.5 px-4 py-3 transition-colors">
          <RestaurantAvatar name={r.name} logoUrl={r.logoUrl} />
          <Link href={`/r/${r.slug}`} className="row-link min-w-0 flex-1 truncate font-medium">
            {r.name}
          </Link>
          {favorites ? <FavoriteStar slug={r.slug} name={r.name} initial={favorites.includes(r.slug)} /> : null}
          <ChevronLeft
            aria-hidden
            className="text-muted-foreground group-hover:text-foreground size-5 transition-transform group-hover:-translate-x-0.5 ltr:rotate-180 ltr:group-hover:translate-x-0.5"
          />
        </li>
      ))}
    </ul>
  );
}
