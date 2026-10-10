"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState, type ReactNode } from "react";
import type { Abi } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { decodeContractError } from "../lib/invoice";

type WriteParams = Parameters<ReturnType<typeof useWriteContract>["writeContractAsync"]>[0];

/** What the wallet will be asked to sign, spelled out for the "technical details" view. */
export type TxCall = {
  contract: string;
  address: `0x${string}`;
  fn: string;
  args: [string, ReactNode][];
};

export type FlowStep =
  | {
      kind: "tx";
      /** Plain-language action, e.g. "Allow the vault to take exactly Rp5,000,000". */
      title: string;
      /** Why this step exists, for someone who has never used a wallet. */
      why: ReactNode;
      call: TxCall;
      params: WriteParams;
    }
  | {
      kind: "offchain";
      /** A free wallet signature (no transaction) rather than a fully automatic step. */
      signature?: boolean;
      title: string;
      why: ReactNode;
      /**
       * Return `failed` to stop the flow with that reason (`final` when retrying cannot change the
       * answer, e.g. a rejection), `outcome` to replace the final message.
       */
      run: () => Promise<{ failed?: string; final?: boolean; outcome?: ReactNode } | void>;
    };

export type FlowPlan = {
  title: string;
  summary: ReactNode;
  steps: FlowStep[];
  done: ReactNode;
};

export type StepStatus = "todo" | "wallet" | "mining" | "working" | "done" | "error";

export type FlowState = {
  plan: FlowPlan;
  phase: "review" | "running" | "done" | "error";
  statuses: StepStatus[];
  hashes: (`0x${string}` | undefined)[];
  error: string | null;
  /** False when the failure is a final answer (a rejection), so "Try again" is pointless. */
  retryable: boolean;
  outcome: ReactNode;
};

/**
 * Runs a plan of onchain (and off-chain) steps behind a review dialog: the user first reads what
 * will happen in plain words, then each wallet request is shown with its status and transaction.
 */
export function useTxFlow() {
  const queryClient = useQueryClient();
  const client = usePublicClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [state, setState] = useState<FlowState | null>(null);
  const settle = useRef<((ok: boolean) => void) | null>(null);

  const patch = (fn: (s: FlowState) => FlowState) => setState((s) => (s ? fn(s) : s));
  const setStatus = (i: number, status: StepStatus, hash?: `0x${string}`) =>
    patch((s) => {
      const statuses = [...s.statuses];
      const hashes = [...s.hashes];
      statuses[i] = status;
      if (hash) hashes[i] = hash;
      return { ...s, statuses, hashes };
    });

  /** Opens the review dialog. Resolves true when every step succeeded, false if cancelled or failed. */
  const start = useCallback((plan: FlowPlan) => {
    settle.current?.(false);
    setState({
      plan,
      phase: "review",
      statuses: plan.steps.map(() => "todo"),
      hashes: plan.steps.map(() => undefined),
      error: null,
      retryable: true,
      outcome: null,
    });
    return new Promise<boolean>((resolve) => {
      settle.current = resolve;
    });
  }, []);

  async function run() {
    if (!state || !client) return;
    const { plan } = state;
    const from = state.statuses.findIndex((st) => st !== "done");
    patch((s) => ({ ...s, phase: "running", error: null }));
    let outcome: ReactNode = null;
    for (let i = Math.max(from, 0); i < plan.steps.length; i++) {
      const step = plan.steps[i]!;
      try {
        if (step.kind === "tx") {
          // Simulate first so a rejection shows its reason instead of a wallet popup that would fail.
          if (address) {
            await client.simulateContract({
              address: step.params.address,
              abi: step.params.abi as Abi,
              functionName: step.params.functionName,
              args: step.params.args as readonly unknown[],
              account: address,
            });
          }
          setStatus(i, "wallet");
          const hash = await writeContractAsync(step.params);
          setStatus(i, "mining", hash);
          await client.waitForTransactionReceipt({ hash });
          queryClient.invalidateQueries();
        } else {
          setStatus(i, "working");
          const result = await step.run();
          if (result?.failed) {
            setStatus(i, "error");
            patch((s) => ({ ...s, phase: "error", error: result.failed!, retryable: !result.final }));
            return;
          }
          if (result?.outcome) outcome = result.outcome;
        }
        setStatus(i, "done");
      } catch (e) {
        const reason = decodeContractError(e);
        setStatus(i, "error");
        patch((s) => ({ ...s, phase: "error", error: reason, retryable: true }));
        return;
      }
    }
    queryClient.invalidateQueries();
    patch((s) => ({ ...s, phase: "done", outcome }));
    settle.current?.(true);
    settle.current = null;
  }

  function close() {
    if (state?.phase === "running") return;
    settle.current?.(state?.phase === "done");
    settle.current = null;
    setState(null);
  }

  return { state, start, run, close, busy: state !== null };
}

export type TxFlow = ReturnType<typeof useTxFlow>;
