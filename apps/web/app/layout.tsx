import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Footer } from "../components/Footer";
import { Nav } from "../components/Nav";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Fakturin: confirmed invoices, funded today",
    template: "%s | Fakturin",
  },
  description:
    "Invoices confirmed by the buyer become a single token on Arbitrum, funded once and repaid automatically. Demo on Arbitrum Sepolia with MockIDR.",
};

export const viewport: Viewport = { themeColor: "#f7f7f7", colorScheme: "light" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body>
        <a href="#content" className="skip-link">
          Skip to content
        </a>
        <Providers>
          <Nav />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
