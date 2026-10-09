"use client";

import type { Address } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { abis } from "../lib/contracts";

export type VaultInfo = {
  address: Address;
  state: number;
  nominal: bigint;
  target: bigint;
  advance: bigint;
  holdback: bigint;
  totalAssets: bigint;
  totalSupply: bigint;
  fundingDeadline: bigint;
  dueDate: bigint;
  defaultableAt: bigint;
  /** Connected wallet: shares, current value of those shares, redeemable shares, deposit room. */
  shares: bigint;
  positionValue: bigint;
  maxRedeem: bigint;
  maxDeposit: bigint;
};

const FIELDS = [
  "state",
  "nominal",
  "target",
  "advance",
  "holdback",
  "totalAssets",
  "totalSupply",
  "fundingDeadline",
  "dueDate",
  "defaultableAt",
] as const;

/** Reads one FakturVault in a single multicall, plus the connected wallet's position. */
export function useVault(vault: Address | undefined) {
  const { address } = useAccount();
  const user = address ?? "0x0000000000000000000000000000000000000000";
  const contracts = vault
    ? [
        ...FIELDS.map((functionName) => ({ address: vault, abi: abis.vault, functionName })),
        { address: vault, abi: abis.vault, functionName: "balanceOf", args: [user] },
        { address: vault, abi: abis.vault, functionName: "maxRedeem", args: [user] },
        { address: vault, abi: abis.vault, functionName: "maxDeposit", args: [user] },
      ]
    : [];
  const q = useReadContracts({ contracts, query: { enabled: Boolean(vault), refetchInterval: 4000 } });

  const r = q.data?.map((x) => x.result);
  if (!vault || !r) return { vault: undefined, isLoading: q.isLoading };
  const big = (i: number) => (typeof r[i] === "bigint" ? (r[i] as bigint) : 0n);

  const totalAssets = big(5);
  const totalSupply = big(6);
  const shares = big(10);
  const info: VaultInfo = {
    address: vault,
    state: Number(r[0] ?? 0),
    nominal: big(1),
    target: big(2),
    advance: big(3),
    holdback: big(4),
    totalAssets,
    totalSupply,
    fundingDeadline: big(7),
    dueDate: big(8),
    defaultableAt: big(9),
    shares,
    // Same rounding as ERC4626 with no decimals offset: shares * (assets + 1) / (supply + 1)
    positionValue: (shares * (totalAssets + 1n)) / (totalSupply + 1n),
    maxRedeem: big(11),
    maxDeposit: big(12),
  };
  return { vault: info, isLoading: q.isLoading };
}
