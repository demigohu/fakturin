"use client";

import { ArrowSquareOut, Check, CircleNotch, WarningOctagon, Wallet, X } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import { encodeFunctionData, type Abi } from "viem";
import type { StepStatus, TxFlow } from "../hooks/useTxFlow";
import { EXPLORER, shortHex } from "../lib/invoice";
import { Button } from "./ui/Button";
import { Notice } from "./ui/Notice";
import s from "./txdialog.module.css";

/** The exact calldata the wallet will sign, so it can be compared with the wallet's "Data" view. */
function rawData(params: { abi: unknown; functionName: string; args?: readonly unknown[] }): string {
  try {
    return encodeFunctionData({ abi: params.abi as Abi, functionName: params.functionName, args: params.args ?? [] });
  } catch {
    return "-";
  }
}

const STATUS_TEXT: Record<StepStatus, string> = {
  todo: "Not started",
  wallet: "Confirm in your wallet…",
  mining: "Waiting for the network to record it…",
  working: "Checking…",
  done: "Done",
  error: "Stopped",
};

/**
 * Review-then-run dialog for every onchain action. Before any wallet popup the user sees, in plain
 * words, what will happen, how many signatures it takes, and exactly what each one authorizes.
 */
export function TxDialog({ flow }: { flow: TxFlow }) {
  const ref = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const { state } = flow;
  const phase = state?.phase;

  // Bring the outcome (success or the reason it stopped) into view when the run ends.
  useEffect(() => {
    if (phase !== "done" && phase !== "error") return;
    const body = bodyRef.current;
    body?.scrollTo({ top: body.scrollHeight, behavior: "smooth" });
  }, [phase]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (state && !d.open) d.showModal();
    if (!state && d.open) d.close();
  }, [state]);

  const txCount = state?.plan.steps.filter((st) => st.kind === "tx").length ?? 0;
  const signatures = txCount + (state?.plan.steps.filter((st) => st.kind === "offchain" && st.signature).length ?? 0);
  const running = state?.phase === "running";

  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-labelledby="txdialog-title"
      onCancel={(e) => {
        e.preventDefault();
        flow.close();
      }}
    >
      {state && (
        <div className={s.inner}>
          <header className={s.head}>
            <h2 id="txdialog-title">{state.plan.title}</h2>
            <button type="button" className={s.x} onClick={flow.close} disabled={running} aria-label="Close">
              <X size={18} />
            </button>
          </header>

          <div className={s.body} ref={bodyRef}>
            <div className={s.summary}>{state.plan.summary}</div>

            <ol className={s.steps}>
              {state.plan.steps.map((step, i) => {
                const status = state.statuses[i]!;
                const hash = state.hashes[i];
                return (
                  <li key={i} className={s.step} data-status={status}>
                    <span className={s.num} aria-hidden>
                      {status === "done" ? (
                        <Check size={16} weight="bold" />
                      ) : status === "error" ? (
                        <WarningOctagon size={16} />
                      ) : status === "wallet" || status === "mining" || status === "working" ? (
                        <CircleNotch size={16} className={s.spin} />
                      ) : (
                        i + 1
                      )}
                    </span>
                    <div className={s.stepText}>
                      <p className={s.stepTitle}>
                        {step.title}
                        {step.kind === "tx" ? (
                          <span className={s.kind}>
                            <Wallet size={13} /> wallet signature
                          </span>
                        ) : step.signature ? (
                          <span className={s.kind}>
                            <Wallet size={13} /> free signature, no transaction
                          </span>
                        ) : (
                          <span className={s.kind}>automatic, no signature</span>
                        )}
                      </p>
                      <p className={s.why}>{step.why}</p>
                      {status !== "todo" && (
                        <p className={s.status}>
                          {STATUS_TEXT[status]}
                          {hash && (
                            <>
                              {" · "}
                              <a href={`${EXPLORER}/tx/${hash}`} target="_blank" rel="noreferrer" className="mono">
                                {shortHex(hash, 8, 6)} <ArrowSquareOut size={12} />
                              </a>
                            </>
                          )}
                        </p>
                      )}
                      {step.kind === "tx" && (
                        <details className={s.details}>
                          <summary>What exactly gets signed</summary>
                          <dl>
                            <dt>Contract</dt>
                            <dd>
                              {step.call.contract}{" "}
                              <a
                                href={`${EXPLORER}/address/${step.call.address}`}
                                target="_blank"
                                rel="noreferrer"
                                className="mono"
                              >
                                {shortHex(step.call.address)}
                              </a>
                            </dd>
                            <dt>Function</dt>
                            <dd className="mono">
                              {step.call.fn}({step.call.args.map(([k]) => k).join(", ")})
                            </dd>
                            {step.call.args.map(([k, v]) => (
                              <div key={k} style={{ display: "contents" }}>
                                <dt className="mono">{k}</dt>
                                <dd>{v}</dd>
                              </div>
                            ))}
                            <dt>ETH sent</dt>
                            <dd>0 (only the network fee)</dd>
                            <dt>Raw data</dt>
                            <dd className={`mono ${s.raw}`}>{rawData(step.params)}</dd>
                          </dl>
                          <p className={s.rawNote}>
                            Wallets often can&apos;t read test tokens, so they may hide the amount or call this an
                            &ldquo;Unknown transaction&rdquo;. Open <em>Advanced → Data</em> in your wallet: it must match the raw
                            data above exactly.
                          </p>
                        </details>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            {state.phase === "error" && state.error && <Notice tone="error">{state.error}</Notice>}
            {state.phase === "done" && <Notice tone="success">{state.outcome ?? state.plan.done}</Notice>}
          </div>

          <footer className={s.foot}>
            {state.phase === "review" && (
              <>
                <p className={s.note}>
                  {signatures === 0
                    ? "No wallet signature needed."
                    : `Your wallet will ask you to confirm ${signatures === 1 ? "once" : `${signatures} times`}.${
                        txCount > 0
                          ? ` Each transaction costs a small network fee paid in test ETH, never in MockIDRX.`
                          : " Signing is free: no transaction, no fee."
                      }`}
                </p>
                <div className={s.buttons}>
                  <Button size="sm" variant="plain" onClick={flow.close}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={flow.run}>
                    {signatures === 0 ? "Start" : "Start and open wallet"}
                  </Button>
                </div>
              </>
            )}
            {running && <p className={s.note}>Keep this window open until every step is done.</p>}
            {state.phase === "error" && (
              <div className={s.buttons}>
                <Button size="sm" variant={state.retryable ? "plain" : "primary"} onClick={flow.close}>
                  Close
                </Button>
                {state.retryable && (
                  <Button size="sm" onClick={flow.run}>
                    Try again
                  </Button>
                )}
              </div>
            )}
            {state.phase === "done" && (
              <div className={s.buttons}>
                <Button size="sm" onClick={flow.close}>
                  Close
                </Button>
              </div>
            )}
          </footer>
        </div>
      )}
    </dialog>
  );
}
