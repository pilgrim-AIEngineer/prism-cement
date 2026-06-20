import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "BuildCityBulk — Bulk building materials at the best price, delivered fast",
    template: "%s · BuildCityBulk",
  },
  description:
    "Stop overpaying for building materials. BuildCityBulk gets builders competitive bulk quotes from verified suppliers and delivers to site, fast — lower costs on every order.",
  openGraph: {
    title: "BuildCityBulk — Bulk building materials at the best price, delivered fast",
    description:
      "Competitive bulk quotes from verified suppliers, delivered to your site fast. Lower costs on every order, more margin on every project.",
    type: "website",
    siteName: "BuildCityBulk",
    images: ["/assets/logo.png"],
  },
  twitter: {
    card: "summary",
    title: "BuildCityBulk — Bulk building materials at the best price, delivered fast",
    description:
      "Competitive bulk quotes from verified suppliers, delivered fast. Stop overpaying for building materials.",
    images: ["/assets/logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#FDF0E8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
