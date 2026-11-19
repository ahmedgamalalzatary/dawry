"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";

export function FavoriteButton({ slug, initial }: { slug: string; initial: boolean }) {
  const t = useTranslations("restaurant");
  const [favorite, setFavorite] = useState(initial);
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    try {
      await api(`/api/me/favorites/${encodeURIComponent(slug)}`, {
        method: favorite ? "DELETE" : "PUT",
      });
      setFavorite(!favorite);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      disabled={pending}
      aria-pressed={favorite}
      className={cn(favorite && "border-brand-strong bg-brand-soft hover:bg-brand-soft")}
    >
      <Star aria-hidden className={cn(favorite && "fill-brand text-brand-strong")} />
      {favorite ? t("unfavorite") : t("favorite")}
    </Button>
  );
}
