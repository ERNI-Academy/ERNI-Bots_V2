import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import { Providers } from "@/components/Providers";
import { fluentThemeCss } from "@/lib/theme/fluentThemeCss";
import { themeBootstrapScript } from "@/lib/theme/themeBootstrap";
import "./globals.css";

// ERNI primary typeface (Brand Book), self-hosted by next/font.
const erniSans = Source_Sans_3({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-erni-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SINGULARITY | EL PROTOCOLO FRAGMENTADO",
  description: "CTF de Infiltración y Dominio de Fortalezas en la Red",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The bootstrap script sets data-theme before hydration, so React must not treat it as a mismatch.
    <html lang="es" className={erniSans.variable} suppressHydrationWarning>
      <head>
        <script id="theme-bootstrap" dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        <style id="fluent-theme" dangerouslySetInnerHTML={{ __html: fluentThemeCss }} />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
