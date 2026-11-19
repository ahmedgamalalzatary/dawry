import type { Metadata, Viewport } from "next";
import { Alexandria, Noto_Sans_Arabic } from "next/font/google";
import { headers } from "next/headers";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { directionOf, resolveLocale } from "@/i18n/config";
import { THEME_SCRIPT } from "@/lib/theme-script";
import "./globals.css";

// Alexandria: an Arabic + Latin face drawn from Egyptian city lettering. Headings and every figure.
const display = Alexandria({
  variable: "--font-display",
  subsets: ["arabic", "latin"],
});

// Noto Sans Arabic: calm reading text in both scripts.
const body = Noto_Sans_Arabic({
  variable: "--font-body",
  subsets: ["arabic", "latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app");
  return { title: { default: t("name"), template: `%s · ${t("name")}` }, description: t("tagline") };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f3" },
    { media: "(prefers-color-scheme: dark)", color: "#121110" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = resolveLocale(await getLocale());
  const dir = directionOf(locale);
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${display.variable} ${body.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col font-sans">
        {/* Sets the light/dark class before first paint (no flash). */}
        <Script id="theme" strategy="beforeInteractive" nonce={nonce}>
          {THEME_SCRIPT}
        </Script>
        <NextIntlClientProvider>
          {children}
          <Toaster position="top-center" dir={dir} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
