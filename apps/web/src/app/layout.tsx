import type { Metadata, Viewport } from "next";
import { Readex_Pro } from "next/font/google";
import { headers } from "next/headers";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/layout/site-header";
import { Toaster } from "@/components/ui/sonner";
import { directionOf, resolveLocale } from "@/i18n/config";
import { THEME_SCRIPT } from "@/lib/theme-script";
import "./globals.css";

// One family for Arabic and Latin; its wide, even numerals carry the queue numbers.
const sans = Readex_Pro({
  variable: "--font-sans",
  subsets: ["arabic", "latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app");
  return { title: t("name"), description: t("tagline") };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f3f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1322" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = resolveLocale(await getLocale());
  const dir = directionOf(locale);
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang={locale} dir={dir} className={`${sans.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col font-sans">
        {/* Sets the light/dark class before first paint (no flash). */}
        <Script id="theme" strategy="beforeInteractive" nonce={nonce}>
          {THEME_SCRIPT}
        </Script>
        <NextIntlClientProvider>
          <SiteHeader />
          <div className="flex flex-1 flex-col">{children}</div>
          <Toaster position="top-center" dir={dir} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
