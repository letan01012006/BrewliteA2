import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LegacyPwaCleanup } from "@/components/layout/legacy-pwa-cleanup";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin", "vietnamese"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#fbf9f5",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export const metadata: Metadata = {
  title: "BrewLite — Một ly ngon. Một ngày thật nhẹ.",
  description:
    "Cà phê hợp gu, đặt món thật dễ. Khám phá thực đơn BrewLite và dành một chút dịu dàng cho ngày của bạn.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="vi"
      className={inter.variable + " " + geistMono.variable}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.remove('dark');",
          }}
        />
      </head>
      <body>
        <div className="app-root">{children}</div>
        <LegacyPwaCleanup />
      </body>
    </html>
  );
}
