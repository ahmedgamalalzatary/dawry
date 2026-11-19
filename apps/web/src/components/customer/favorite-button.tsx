"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";

/** Save or forget a favourite restaurant; flips at once and rolls back if the request fails. */
function useFavorite(slug: string, initial: boolean) {
  const t = useTranslations("restaurant");
  const tc = useTranslations("common");
  const [favorite, setFavorite] = useState(initial);
  const [pending, setPending] = useState(false);

  async function toggle() {
    const next = !favorite;
    setFavorite(next);
    setPending(true);
    try {
      await api(`/api/me/favorites/${encodeURIComponent(slug)}`, { method: next ? "PUT" : "DELETE" });
      toast.success(next ? t("favorited") : t("unfavorited"));
    } catch {
      setFavorite(!next);
      toast.error(tc("error"));
    } finally {
      setPending(false);
    }
  }

  return { favorite, pending, toggle };
}

/** A labelled button for the dark board header of a restaurant or order page. */
export function FavoriteButton({ slug, initial }: { slug: string; initial: boolean }) {
  const t = useTranslations("restaurant");
  const { favorite, pending, toggle } = useFavorite(slug, initial);
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={favorite}
      className={cn(
        "inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3.5 text-sm font-medium transition-colors disabled:opacity-70",
        favorite
          ? "border-[#f2b25c]/40 bg-[#f2b25c]/15 text-[#f5c57e]"
          : "border-board-line bg-board-raised/60 hover:bg-board-raised",
      )}
    >
      <Star aria-hidden className={cn("size-4", favorite && "fill-current")} />
      {favorite ? t("unfavorite") : t("favorite")}
    </button>
  );
}

/** A star icon button for list rows (sits above the row's link). */
export function FavoriteStar({ slug, name, initial }: { slug: string; name: string; initial: boolean }) {
  const t = useTranslations("restaurant");
  const { favorite, pending, toggle } = useFavorite(slug, initial);
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={favorite}
      aria-label={`${favorite ? t("unfavorite") : t("favorite")}: ${name}`}
      title={favorite ? t("unfavorite") : t("favorite")}
      className={cn(
        "relative z-10 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors",
        favorite ? "text-preparing hover:bg-preparing-soft" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Star aria-hidden className={cn("size-[1.125rem]", favorite && "fill-current")} />
    </button>
  );
}
