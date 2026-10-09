"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Abi } from "viem";
import { useAccount, usePublicClient, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { decodeContractError } from "../lib/invoice";

type WriteParams = Parameters<ReturnType<typeof useWriteContract>["writeContractAsync"]>[0];

export function useTx() {
  const queryClient = useQueryClient();
  const client = usePublicClient();
  const { address } = useAccount();
  const { writeContractAsync, isPending, error, data: hash, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const [failure, setFailure] = useState<string | null>(null);
  const [step, setStep] = useState<string | null>(null);

  // Refresh every onchain read once a write lands, so statuses update without reload.
  useEffect(() => {
    if (isSuccess) queryClient.invalidateQueries();
  }, [isSuccess, queryClient]);

  async function send(params: WriteParams): Promise<`0x${string}`> {
    // Simulate first so contract rejections ("Already registered", ...) surface with their
    // decoded reason instead of a wallet popup for a transaction that would revert.
    if (client && address) {
      await client.simulateContract({
        address: params.address,
        abi: params.abi as Abi,
        functionName: params.functionName,
        args: params.args as readonly unknown[],
        account: address,
      });
    }
    return writeContractAsync(params);
  }

  /** One transaction; resolves once submitted. */
  async function write(params: WriteParams): Promise<`0x${string}` | undefined> {
    reset();
    setFailure(null);
    try {
      return await send(params);
    } catch (e) {
      const reason = decodeContractError(e);
      setFailure(reason);
      throw new Error(reason);
    }
  }

  /**
   * Several transactions in order (e.g. approve then deposit), each mined before the next is
   * simulated. `label` names the step shown while it runs.
   */
  async function sequence(steps: { label: string; params: WriteParams }[]): Promise<`0x${string}` | undefined> {
    reset();
    setFailure(null);
    let last: `0x${string}` | undefined;
    try {
      for (const s of steps) {
        setStep(s.label);
        last = await send(s.params);
        await client!.waitForTransactionReceipt({ hash: last });
      }
      queryClient.invalidateQueries();
      return last;
    } catch (e) {
      const reason = decodeContractError(e);
      setFailure(reason);
      throw new Error(reason);
    } finally {
      setStep(null);
    }
  }

  return {
    write,
    sequence,
    reset,
    step,
    isPending: isPending || confirming || step !== null,
    isSuccess,
    error: failure ?? (error ? decodeContractError(error) : null),
    hash,
  };
}
