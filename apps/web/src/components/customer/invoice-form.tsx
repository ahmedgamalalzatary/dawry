"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { orderPath } from "@/lib/routes";

/** One question, one big field: the number printed on the receipt. */
export function InvoiceForm({ slug }: { slug: string }) {
  const t = useTranslations("restaurant");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invoice = String(new FormData(event.currentTarget).get("invoice") ?? "").trim();
    if (!invoice) return;
    setPending(true);
    router.push(orderPath(slug, invoice));
  }

  return (
    <form onSubmit={onSubmit} className="bg-surface shadow-raise flex flex-col gap-4 rounded-2xl border p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <label htmlFor="invoice" className="font-heading text-lg font-semibold">
          {t("invoice")}
        </label>
        <p id="invoice-hint" className="text-muted-foreground text-sm">
          {t("invoiceHint")}
        </p>
      </div>
      <input
        id="invoice"
        name="invoice"
        required
        maxLength={32}
        inputMode="numeric"
        autoComplete="off"
        autoFocus
        dir="ltr"
        placeholder="000"
        aria-describedby="invoice-hint"
        className="figure border-input bg-subtle placeholder:text-muted-foreground/35 focus-visible:border-ring focus-visible:ring-ring/20 h-20 w-full rounded-xl border text-center text-5xl font-semibold tracking-wide transition-[border-color,box-shadow] outline-none focus-visible:ring-4"
      />
      <Button type="submit" size="lg" disabled={pending}>
        {t("check")}
        <ArrowLeft aria-hidden className="ltr:rotate-180" />
      </Button>
    </form>
  );
}
