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
  /** Platform fee taken on repayment. Funders share `nominal - fee`. */
  fee: bigint;
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
  "fee",
  "totalAssets",
  "totalSupply",
  "fundingDeadline",
  "dueDate",
  "defaultableAt",
] as const;

/** What `amount` lent into a vault pays back when the seller repays (after the platform fee). */
export function payoutAtRepayment(amount: bigint, v: Pick<VaultInfo, "nominal" | "fee" | "target">): bigint {
  return v.target > 0n ? (amount * (v.nominal - v.fee)) / v.target : 0n;
}

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

  const totalAssets = big(6);
  const totalSupply = big(7);
  const shares = big(11);
  const info: VaultInfo = {
    address: vault,
    state: Number(r[0] ?? 0),
    nominal: big(1),
    target: big(2),
    advance: big(3),
    holdback: big(4),
    fee: big(5),
    totalAssets,
    totalSupply,
    fundingDeadline: big(8),
    dueDate: big(9),
    defaultableAt: big(10),
    shares,
    // Same rounding as ERC4626 with no decimals offset: shares * (assets + 1) / (supply + 1)
    positionValue: (shares * (totalAssets + 1n)) / (totalSupply + 1n),
    maxRedeem: big(12),
    maxDeposit: big(13),
  };
  return { vault: info, isLoading: q.isLoading };
}
