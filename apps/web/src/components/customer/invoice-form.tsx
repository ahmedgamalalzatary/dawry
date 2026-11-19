"use client";

import { Receipt } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { orderPath } from "@/lib/routes";

/** The invoice number is typed onto a blank ticket. */
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
    <form onSubmit={onSubmit} className="ticket-shadow">
      <div className="ticket-top bg-brand text-brand-foreground rounded-t-3xl px-6 pt-6 pb-7">
        <label htmlFor="invoice" className="flex items-center justify-center gap-2 text-sm font-semibold">
          <Receipt aria-hidden className="size-4" />
          {t("invoice")}
        </label>
        <input
          id="invoice"
          name="invoice"
          required
          maxLength={32}
          inputMode="numeric"
          autoComplete="off"
          dir="ltr"
          placeholder="000"
          className="placeholder:text-brand-foreground/25 mt-3 w-full rounded-2xl border-2 border-black/15 bg-white/55 py-3 text-center text-5xl font-bold tracking-wider tabular-nums transition outline-none focus-visible:border-[#16233f] focus-visible:bg-white/80"
        />
      </div>
      <div className="ticket-bottom bg-card rounded-b-3xl px-6 pb-6">
        <div className="perforation mx-1 mb-5" />
        <Button type="submit" variant="default" size="lg" className="w-full" disabled={pending}>
          {t("check")}
        </Button>
      </div>
    </form>
  );
}
