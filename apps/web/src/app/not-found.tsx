import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-xl">{t("notFound")}</p>
      <Link href="/" className="text-primary underline">
        {t("back")}
      </Link>
    </main>
  );
}
