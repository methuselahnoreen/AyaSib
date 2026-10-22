import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { Splash } from "@/components/Splash";
import "./globals.css";

// Body / UI typeface (self-hosted at build; no runtime network).
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

// Display face for the "Andam Na?" hero and selected headings.
// Owner-provided Roca Two (Bold only) — see .kiro/specs/ayasib-frontend-redesign/design.md.
const rocaTwo = localFont({
  src: "../../public/fonts/RocaTwo-Bold.ttf",
  variable: "--font-display-face",
  weight: "700",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AyaSib",
  description: "Tabang sa pagsabot sa mga serbisyo sa gobyerno, sa Bisaya.",
  icons: { icon: "/logo.svg" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ceb" className={`${inter.variable} ${rocaTwo.variable}`}>
      <body>
        <Splash />
        {children}
      </body>
    </html>
  );
}
