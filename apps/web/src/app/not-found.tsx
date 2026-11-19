import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { DawryMark } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
      <DawryMark className="size-12" />
      <p className="figure text-6xl font-semibold tracking-tight">404</p>
      <p className="text-muted-foreground max-w-sm">{t("notFoundHint")}</p>
      <Link href="/" className={buttonVariants()}>
        {t("home")}
      </Link>
    </main>
  );
}
