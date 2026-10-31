import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Manrope, Noto_Naskh_Arabic, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { LOCALE_COOKIE } from "@/i18n";
import { isLocale, LOCALE_DIR, type Locale } from "@/i18n/config";

const geist = Geist({ variable: "--font-ui", subsets: ["latin"] });
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  fallback: ["system-ui", "sans-serif"],
});
const devanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
});
const arabic = Noto_Naskh_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Masjid Collection",
  description: "Local-first masjid contribution, receipt and accounts management",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(value) ? value : "en";
  const dir = LOCALE_DIR[locale];

  return (
    <html lang={locale} dir={dir} className={`${geist.variable} ${manrope.variable} ${devanagari.variable} ${arabic.variable} h-full`}>
      <body className="min-h-full antialiased font-[var(--font-ui)]">{children}</body>
    </html>
  );
}
