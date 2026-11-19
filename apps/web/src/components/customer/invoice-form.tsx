"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { orderPath } from "@/lib/routes";

export function InvoiceForm({ slug }: { slug: string }) {
  const t = useTranslations("restaurant");
  const router = useRouter();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invoice = String(new FormData(event.currentTarget).get("invoice") ?? "").trim();
    if (invoice) router.push(orderPath(slug, invoice));
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <Label htmlFor="invoice">{t("invoice")}</Label>
      <Input
        id="invoice"
        name="invoice"
        required
        maxLength={32}
        inputMode="numeric"
        autoComplete="off"
        dir="ltr"
        className="h-12 text-center text-xl"
      />
      <Button type="submit" size="lg">
        {t("check")}
      </Button>
    </form>
  );
}
