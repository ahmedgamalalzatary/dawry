import type { PublicRestaurant, SavedOrder } from "@dawry/shared";
import { getTranslations } from "next-intl/server";
import { CustomerNav } from "@/components/customer/customer-nav";
import { requireKind, serverGet } from "@/lib/api/server";

/** The customer's account: current orders, history and favourite restaurants. */
export default async function MeLayout({ children }: LayoutProps<"/me">) {
  const me = await requireKind("customer");
  const [t, orders, favorites] = await Promise.all([
    getTranslations("me"),
    serverGet<SavedOrder[]>("/api/me/orders"),
    serverGet<PublicRestaurant[]>("/api/me/favorites"),
  ]);
  const active = (orders ?? []).filter((o) => o.status === "preparing" || o.status === "out_for_delivery").length;

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-1 px-4 pt-8 sm:px-6 sm:pt-12">
          <h1 className="text-[1.75rem] font-semibold tracking-tight">{t("account")}</h1>
          <p className="text-muted-foreground mb-4 text-sm">{t("greeting", { name: me.name })}</p>
          <CustomerNav
            counts={{ active, history: (orders?.length ?? 0) - active, favorites: favorites?.length ?? 0 }}
          />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-16 sm:px-6 sm:pt-8">{children}</main>
    </div>
  );
}
