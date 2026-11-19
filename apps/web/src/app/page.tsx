import { getTranslations } from "next-intl/server";

// Placeholder home page; the customer lookup is built as a feature.
export default async function Home() {
  const t = await getTranslations("app");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-3xl font-semibold">{t("name")}</h1>
      <p className="text-muted-foreground">{t("tagline")}</p>
    </main>
  );
}
