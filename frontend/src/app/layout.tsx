import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AyaSib",
  description: "Tabang sa pagsabot sa mga serbisyo sa gobyerno, sa Bisaya.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ceb">
      <body>{children}</body>
    </html>
  );
}
