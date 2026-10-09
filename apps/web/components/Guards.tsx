"use client";

import type { ReactNode } from "react";
import { useAccount } from "wagmi";
import { contractsConfigured } from "../lib/contracts";
import { ConnectButton } from "./ConnectButton";
import { EmptyState, Panel } from "./ui/Panel";

export function NotConfigured() {
  return (
    <Panel title="Contracts not connected" tag="Setup">
      <EmptyState title="Contract addresses are missing">
        Deploy the v2 contracts (script/DeployFaktur.s.sol) to Arbitrum Sepolia, copy the
        addresses into apps/web/.env.local following .env.example, then restart the dev server.
      </EmptyState>
      <pre className="mono" style={{ fontSize: 13, overflowX: "auto", lineHeight: 1.5 }}>
        {`cd apps/contracts-solidity
forge script script/DeployFaktur.s.sol:DeployFaktur \\
  --rpc-url $ARBITRUM_SEPOLIA_RPC_URL --broadcast`}
      </pre>
    </Panel>
  );
}

/** Renders children only when contracts are configured; otherwise the setup panel. */
export function RequireContracts({ children }: { children: ReactNode }) {
  if (!contractsConfigured()) return <NotConfigured />;
  return <>{children}</>;
}

/** Shows a connect prompt inside a panel body when no wallet is connected. */
export function RequireWallet({ children, why }: { children: ReactNode; why: string }) {
  const { isConnected } = useAccount();
  if (!isConnected) {
    return (
      <EmptyState title="Connect a wallet first" action={<div style={{ height: 52 }}><ConnectButton /></div>}>
        {why}
      </EmptyState>
    );
  }
  return <>{children}</>;
}
