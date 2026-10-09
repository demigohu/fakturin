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

export function useRegistryParams() {
  const enabled = contractsConfigured();
  const read = (functionName: string) => ({ address: addresses.registry, abi: abis.registry, functionName, query: { enabled } });
  const discount = useReadContract(read("discountBps"));
  const advance = useReadContract(read("advanceBps"));
  const grace = useReadContract(read("gracePeriod"));
  const sellerLimit = useReadContract(read("sellerLimit"));
  const big = (v: unknown) => (typeof v === "bigint" ? v : undefined);
  return {
    discountBps: big(discount.data),
    advanceBps: big(advance.data),
    gracePeriod: big(grace.data),
    sellerLimit: big(sellerLimit.data),
  };
}

/** Target (what funders pay), advance (to seller at fill) and holdback for a nominal. */
export function splitNominal(nominal: bigint, discountBps: bigint, advanceBps: bigint) {
  const target = (nominal * (10_000n - discountBps)) / 10_000n;
  const advance = (nominal * advanceBps) / 10_000n;
  return { target, advance, holdback: target - advance, yieldAmount: nominal - target };
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
