"use client";

import type { PublicRestaurant } from "@dawry/shared";
import { Star } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { ListToolbar, NoMatches, ResultCount, SearchField } from "@/components/ui/list-toolbar";
import { matchesSearch, useParam } from "@/lib/list";
import { cn } from "@/lib/utils";
import { RestaurantList } from "./restaurant-search";


/** Saved restaurants with search; the star on each row removes (or re-adds) it. */
export function FavoriteList({ initial }: { initial: PublicRestaurant[] }) {
  const t = useTranslations("me");
  const [query, setQuery] = useParam("q", "");

  if (initial.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center">
        <Star aria-hidden className="text-muted-foreground size-8" />
        <p className="font-medium">{t("noFavorites")}</p>
        <p className="text-muted-foreground max-w-xs text-sm">{t("favoritesHint")}</p>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "mt-1")}>
          {t("findRestaurant")}
        </Link>
      </div>
    );
  }

  const visible = initial
    .filter((r) => matchesSearch(query, r.name, r.slug))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-4">
      <ListToolbar
        search={<SearchField value={query} onChange={setQuery} placeholder={t("searchFavorites")} />}
        onReset={() => setQuery("")}
        count={<ResultCount shown={visible.length} total={initial.length} />}
      />
      {visible.length === 0 ? (
        <div className="bg-surface rounded-xl border">
          <NoMatches onClear={() => setQuery("")} />
        </div>
      ) : (
        <RestaurantList restaurants={visible} favorites={initial.map((r) => r.slug)} />
      )}
    </div>
  );
}
