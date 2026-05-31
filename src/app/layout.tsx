import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Huisturf",
  description: "Turf app voor het studentenhuis: bier, koffie en eieren.",
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
