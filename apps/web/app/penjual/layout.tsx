import type { Metadata } from "next";

export const metadata: Metadata = { title: "Seller" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
