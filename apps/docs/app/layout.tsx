import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { RootProvider } from "fumadocs-ui/provider/next";
import "./global.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_DOCS_URL ?? "http://localhost:3001"),
  title: {
    default: "Fakturin Docs",
    template: "%s | Fakturin Docs",
  },
  description:
    "How Fakturin works: guides for borrowers and lenders, pricing, Chainlink CRE verification, Chainlink ACE identity, ERC-4626 invoice vaults, architecture and contract reference.",
};

export const viewport: Viewport = { themeColor: "#f7f7f7", colorScheme: "light" };

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider theme={{ enabled: false }}>{children}</RootProvider>
      </body>
    </html>
  );
}
