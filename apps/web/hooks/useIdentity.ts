"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, useReadContract, useSignMessage } from "wagmi";
import { abis, addresses, contractsConfigured } from "../lib/contracts";
import { identityMessage, type IdentityKind } from "../lib/identity";
import type { PjapAccount } from "../lib/pjap";

/**
 * The connected wallet's Chainlink ACE identity, as the registry sees it:
 * funder = valid `common.kyc`; seller = `common.kyb` + `id.fakturin.pkp`.
 */
export function useIdentity() {
  const { address } = useAccount();
  const enabled = Boolean(address && contractsConfigured());
  const read = (functionName: string) => ({
    address: addresses.registry,
    abi: abis.registry,
    functionName,
    args: address ? [address] : undefined,
    query: { enabled, refetchInterval: 6000 },
  });
  const funder = useReadContract(read("isFunder"));
  const seller = useReadContract(read("isSeller"));
  const npwp = useReadContract(read("sellerNpwpHash"));
  const flagged = useReadContract(read("sellerDefaulted"));
  return {
    address,
    isFunder: funder.data === true,
    isSeller: seller.data === true,
    sellerNpwpHash: npwp.data as `0x${string}` | undefined,
    flagged: flagged.data === true,
    loading: funder.isLoading || seller.isLoading,
  };
}

/** SIMULATED PJAP account (business, NPWP, seller code) linked to a wallet. */
export function usePjapAccount(wallet: string | undefined) {
  return useQuery({
    queryKey: ["pjap-account", wallet],
    enabled: Boolean(wallet),
    staleTime: Infinity,
    queryFn: async (): Promise<PjapAccount> => {
      const res = await fetch(`/api/pjap/account/${wallet}`);
      if (!res.ok) throw new Error("PJAP account lookup failed");
      return res.json();
    },
  });
}

/** Sign-then-issue helpers for identityPlan: a free wallet signature, then the simulated issuer. */
export function useIdentityIssuer(kind: IdentityKind) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const queryClient = useQueryClient();

  async function sign() {
    if (!address) throw new Error("Connect your wallet first.");
    const issuedAt = new Date().toISOString();
    const signature = await signMessageAsync({ message: identityMessage(kind, address, issuedAt) });
    return { issuedAt, signature };
  }

  async function issue(proof: { issuedAt: string; signature: `0x${string}` }) {
    const res = await fetch("/api/identity", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, address, ...proof }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return { failed: body.error ?? "The verification provider is not available." };
    await queryClient.invalidateQueries();
  }

  return { sign, issue };
}
