"use client";

import type { PublicRestaurant } from "@dawry/shared";
import { ChevronLeft, Search, Store } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import { RestaurantAvatar } from "./restaurant-avatar";

export function RestaurantSearch({ initial }: { initial: PublicRestaurant[] }) {
  const t = useTranslations("home");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(initial);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setResults(
          await api<PublicRestaurant[]>(`/api/public/restaurants?q=${encodeURIComponent(query)}`),
        );
      } catch {
        // keep the previous results
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search
          aria-hidden
          className="text-muted-foreground pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2"
        />
        <Input
          type="search"
          aria-label={t("search")}
          placeholder={t("search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-13 rounded-2xl ps-12 text-base md:text-base"
        />
      </div>
      {results.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-10 text-center">
          <Store aria-hidden className="size-8 opacity-60" />
          <p className="text-sm">{t("noResults")}</p>
        </div>
      ) : (
        <RestaurantList restaurants={results} />
      )}
    </div>
  );
}

export function RestaurantList({ restaurants }: { restaurants: PublicRestaurant[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {restaurants.map((r) => (
        <li key={r.slug}>
          <Link
            href={`/r/${r.slug}`}
            className="group bg-card hover:border-brand-strong focus-visible:ring-ring/60 flex items-center gap-3 rounded-2xl border p-3 transition-[border-color,box-shadow,transform] outline-none hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-12px_rgb(22_35_63/0.4)] focus-visible:ring-3"
          >
            <RestaurantAvatar name={r.name} logoUrl={r.logoUrl} />
            <span className="flex-1 truncate font-semibold">{r.name}</span>
            <ChevronLeft
              aria-hidden
              className="text-muted-foreground group-hover:text-foreground size-5 transition-transform group-hover:-translate-x-0.5 ltr:rotate-180 ltr:group-hover:translate-x-0.5"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
