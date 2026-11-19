"use client";

import type { PublicRestaurant } from "@dawry/shared";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";

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
    <div className="flex flex-col gap-3">
      <Input
        type="search"
        aria-label={t("search")}
        placeholder={t("search")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {results.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("noResults")}</p>
      ) : (
        <RestaurantList restaurants={results} />
      )}
    </div>
  );
}

export function RestaurantList({ restaurants }: { restaurants: PublicRestaurant[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {restaurants.map((r) => (
        <li key={r.slug}>
          <Link
            href={`/r/${r.slug}`}
            className="hover:bg-muted flex items-center gap-3 rounded-lg border p-3"
          >
            {r.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- restaurant logos are external URLs
              <img src={r.logoUrl} alt="" className="size-10 rounded-md object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="bg-muted flex size-10 items-center justify-center rounded-md font-bold">
                {r.name.slice(0, 1)}
              </span>
            )}
            <span className="font-medium">{r.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
