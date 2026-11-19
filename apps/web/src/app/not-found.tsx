import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { DawryMark } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
      <DawryMark className="h-12 -rotate-6 opacity-90" />
      <p className="text-6xl font-bold tracking-tighter tabular-nums">404</p>
      <p className="text-muted-foreground text-lg">{t("notFound")}</p>
      <Link href="/" className={buttonVariants({ variant: "brand" })}>
        {t("back")}
      </Link>
    </main>
  );
}
