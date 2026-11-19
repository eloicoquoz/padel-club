import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getT } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";
import { PwaRegister } from "@/components/pwa";
import { cookies } from "next/headers";
import { DEFAULT_THEME, THEME_COOKIE, isTheme } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Padel Club · Fribourg-Gottéron",
  description: "Le classement officiel du vestiaire.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Padel Club" },
  icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f3f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0d" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getT();
  const raw = (await cookies()).get(THEME_COOKIE)?.value;
  const theme = isTheme(raw) ? raw : DEFAULT_THEME;
  return (
    <html lang={locale} data-theme={theme} className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-text">
        <I18nProvider locale={locale} dict={t}>
          {children}
        </I18nProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
