"use client";

import { useQuery } from "@tanstack/react-query";
import { parseAbiItem, type Address } from "viem";
import { usePublicClient } from "wagmi";
import { addresses, contractsConfigured } from "../lib/contracts";

/** Block the contracts were deployed at; scanning from 0 can hit RPC range limits. */
const FROM_BLOCK = BigInt(process.env.NEXT_PUBLIC_DEPLOY_BLOCK || "0");

const EV = {
  requested: parseAbiItem(
    "event VerificationRequested(bytes32 indexed invoiceId, address indexed seller, string fakturNumber)",
  ),
  verified: parseAbiItem(
    "event InvoiceVerified(bytes32 indexed invoiceId, address indexed vault, uint256 nominal, uint256 target, uint64 dueDate)",
  ),
};

/** Invoice IDs a seller has requested, newest first. */
export function useSellerInvoices(seller: Address | undefined) {
  const client = usePublicClient();
  return useQuery({
    queryKey: ["seller-invoices", seller],
    enabled: Boolean(client && contractsConfigured() && seller),
    refetchInterval: 6000,
    queryFn: async () => {
      const logs = await client!.getLogs({
        address: addresses.registry,
        event: EV.requested,
        args: { seller },
        fromBlock: FROM_BLOCK,
      });
      return [...new Set(logs.map((l) => l.args.invoiceId!).reverse())];
    },
  });
}

export type VerifiedVault = { invoiceId: `0x${string}`; vault: Address };

/** Every vault ever opened, newest first. Live state is read per vault. */
export function useVaults() {
  const client = usePublicClient();
  return useQuery({
    queryKey: ["vaults"],
    enabled: Boolean(client && contractsConfigured()),
    refetchInterval: 6000,
    queryFn: async (): Promise<VerifiedVault[]> => {
      const logs = await client!.getLogs({ address: addresses.registry, event: EV.verified, fromBlock: FROM_BLOCK });
      return logs.reverse().map((l) => ({ invoiceId: l.args.invoiceId!, vault: l.args.vault! }));
    },
  });
}

const FUNDED = parseAbiItem("event Funded(uint256 advance, uint256 holdback)");

/** The transaction that filled `vault` and paid the seller their advance (FakturVault.Funded). */
export function useFundedTx(vault: Address | undefined) {
  const client = usePublicClient();
  return useQuery({
    queryKey: ["funded-tx", vault],
    enabled: Boolean(client && vault),
    staleTime: Infinity,
    queryFn: async () => {
      const logs = await client!.getLogs({ address: vault, event: FUNDED, fromBlock: FROM_BLOCK });
      return logs[0]?.transactionHash ?? null;
    },
  });
}
