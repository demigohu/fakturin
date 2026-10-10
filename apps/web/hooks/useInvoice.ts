"use client";

import { useQuery } from "@tanstack/react-query";
import { useReadContract } from "wagmi";
import { abis, addresses, contractsConfigured } from "../lib/contracts";
import type { PjapFaktur } from "../lib/pjap";
import type { InvoiceStruct } from "../lib/types";

export type Invoice = InvoiceStruct & { id: `0x${string}` };

const ZERO = "0x0000000000000000000000000000000000000000";

export function useInvoice(id: `0x${string}` | undefined, opts: { poll?: boolean } = {}) {
  const query = useReadContract({
    address: addresses.registry,
    abi: abis.registry,
    functionName: "getInvoice",
    args: id ? [id] : undefined,
    query: { enabled: Boolean(id && contractsConfigured()), refetchInterval: opts.poll ? 2500 : false },
  });
  const raw = query.data as InvoiceStruct | undefined;
  const invoice: Invoice | undefined = raw && id ? { ...raw, id, status: Number(raw.status), rejectCode: Number(raw.rejectCode) } : undefined;
  const hasVault = Boolean(invoice && invoice.vault !== ZERO);
  return { invoice, hasVault, isLoading: query.isLoading, refetch: query.refetch };
}

export function useFakturNumber(id: `0x${string}` | undefined) {
  const { data } = useReadContract({
    address: addresses.registry,
    abi: abis.registry,
    functionName: "fakturNumberOf",
    args: id ? [id] : undefined,
    query: { enabled: Boolean(id && contractsConfigured()) },
  });
  return data as string | undefined;
}

export type RegistryParams = {
  ratePer30dBps?: bigint;
  platformFeeBps?: bigint;
  advanceBps?: bigint;
  maxTenor?: bigint;
  gracePeriod?: bigint;
  sellerLimit?: bigint;
};

export function useRegistryParams(): RegistryParams {
  const enabled = contractsConfigured();
  const read = (functionName: string) => ({ address: addresses.registry, abi: abis.registry, functionName, query: { enabled } });
  const rate = useReadContract(read("ratePer30dBps"));
  const fee = useReadContract(read("platformFeeBps"));
  const advance = useReadContract(read("advanceBps"));
  const maxTenor = useReadContract(read("maxTenor"));
  const grace = useReadContract(read("gracePeriod"));
  const sellerLimit = useReadContract(read("sellerLimit"));
  const big = (v: unknown) => (typeof v === "bigint" ? v : undefined);
  return {
    ratePer30dBps: big(rate.data),
    platformFeeBps: big(fee.data),
    advanceBps: big(advance.data),
    maxTenor: big(maxTenor.data),
    gracePeriod: big(grace.data),
    sellerLimit: big(sellerLimit.data),
  };
}

export type Price = {
  nominal: bigint;
  /** What funders lend in total (vault target). */
  target: bigint;
  /** Sent to the seller when the vault fills. */
  advance: bigint;
  /** Kept in the vault, released to the seller on repayment. */
  holdback: bigint;
  /** Seller's all-in cost: nominal - target. */
  discount: bigint;
  /** Platform fee taken from the discount on repayment. */
  fee: bigint;
  /** What funders earn on top of what they lent. */
  funderGain: bigint;
  tenorDays: number;
};

/** Mirrors FakturRegistry.quote: cost grows per day of tenor; the platform keeps a share of it. */
export function priceInvoice(nominal: bigint, dueDate: bigint, now: bigint, p: RegistryParams): Price | undefined {
  if (p.ratePer30dBps === undefined || p.platformFeeBps === undefined || p.advanceBps === undefined) return undefined;
  const tenor = dueDate > now ? dueDate - now : 0n;
  const discount = (nominal * p.ratePer30dBps * tenor) / (30n * 86_400n * 10_000n);
  const target = nominal - discount;
  const advance = (nominal * p.advanceBps) / 10_000n;
  const fee = (discount * p.platformFeeBps) / 10_000n;
  return {
    nominal,
    target,
    advance,
    holdback: target - advance,
    discount,
    fee,
    funderGain: discount - fee,
    tenorDays: Number(tenor) / 86_400,
  };
}

/** SIMULATED PJAP lookup through the app's own mock endpoint (buyer name, amounts, dates). */
export function usePjap(number: string | undefined) {
  const digits = number?.replace(/\D/g, "") ?? "";
  return useQuery({
    queryKey: ["pjap", digits],
    enabled: digits.length >= 13,
    staleTime: 60_000,
    queryFn: async (): Promise<PjapFaktur> => {
      const res = await fetch(`/api/pjap/faktur/${digits}`);
      return (await res.json()) as PjapFaktur;
    },
  });
}
