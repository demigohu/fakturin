"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { arbitrumSepolia } from "@reown/appkit/networks";
import { WagmiProvider } from "wagmi";
import { appKitEnabled, networks, projectId, wagmiAdapter, wagmiConfig } from "../lib/wagmi";
import { useState } from "react";

// One AppKit instance for the app, themed to DESIGN.md (square, Fakturin blue, Geist).
if (appKitEnabled && wagmiAdapter) createAppKit({
  adapters: [wagmiAdapter],
  networks,
  defaultNetwork: arbitrumSepolia,
  projectId,
  metadata: {
    name: "Fakturin",
    description: "Confirmed invoice financing on Arbitrum",
    url: typeof window !== "undefined" ? window.location.origin : "https://fakturin.app",
    icons: [],
  },
  features: { analytics: false, email: false, socials: false, swaps: false, onramp: false },
  // Legacy Coinbase Wallet SDK; Base Account stays available (see lib/wagmi.ts).
  enableCoinbase: false,
  themeMode: "light",
  themeVariables: {
    "--w3m-accent": "#4da2ff",
    "--w3m-border-radius-master": "0px",
    "--w3m-font-family": "var(--font-geist-sans), Arial, sans-serif",
    "--w3m-z-index": 70,
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
