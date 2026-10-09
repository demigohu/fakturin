"use client";

import { useState } from "react";
import { Check, X } from "@phosphor-icons/react";
import { useAccount, useReadContract } from "wagmi";
import { FundingProgress } from "../../components/FundingProgress";
import { AutoClose } from "../../components/AutoClose";
import { RequireContracts, RequireWallet } from "../../components/Guards";
import { Muted, PageShell, Split, Stack } from "../../components/PageShell";
import { Address } from "../../components/ui/Address";
import { Button } from "../../components/ui/Button";
import { TxFeedback } from "../../components/ui/Notice";
import { EmptyState, KeyValue, Panel, SimTag, Skeleton } from "../../components/ui/Panel";
import { StatusBadge } from "../../components/ui/Status";
import { useVaults, type VerifiedVault } from "../../hooks/useEvents";
import { useFakturNumber, useInvoice, usePjap } from "../../hooks/useInvoice";
import { useNow } from "../../hooks/useNow";
import { useTx } from "../../hooks/useTx";
import { useVault, type VaultInfo } from "../../hooks/useVault";
import { abis, addresses } from "../../lib/contracts";
import { formatDate, formatIdrShort, formatMockIdr, parseMockIdr, VAULT_STATE } from "../../lib/invoice";
import p from "./pasar.module.css";

type Tx = ReturnType<typeof useTx>;

export default function MarketPage() {
  return (
    <PageShell
      href="/pasar"
      title="Fund verified invoices"
      lead="Every vault holds one Faktur Pajak that Chainlink CRE checked with the tax system. Pick one, fund any part of it, and withdraw with the return once the seller repays."
    >
      <RequireContracts>
        <MarketScreen />
      </RequireContracts>
    </PageShell>
  );
}

function useFunder() {
  const { address } = useAccount();
  const enabled = Boolean(address);
  const funder = useReadContract({
    address: addresses.registry,
    abi: abis.registry,
    functionName: "isFunder",
    args: address ? [address] : undefined,
    query: { enabled },
  });
  const balance = useReadContract({
    address: addresses.mockIdr,
    abi: abis.mockIdr,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled, refetchInterval: 5000 },
  });
  return { isFunder: funder.data === true, balance: typeof balance.data === "bigint" ? balance.data : 0n };
}

type Funder = ReturnType<typeof useFunder>;

function MarketScreen() {
  const tx = useTx();
  const [done, setDone] = useState("");
  const funder = useFunder();
  const { data: vaults, isLoading, error } = useVaults();

  const run = (msg: string, steps: Parameters<Tx["sequence"]>[0]) => {
    setDone("");
    tx.sequence(steps)
      .then(() => setDone(msg))
      .catch(() => undefined);
  };

  return (
    <Split>
      <Stack>
        <Panel title="Open for funding" flush>
          {error ? (
            <EmptyState title="Could not read events">
              The RPC refused the log scan. Set NEXT_PUBLIC_DEPLOY_BLOCK to the contract deploy block.
            </EmptyState>
          ) : isLoading ? (
            <EmptyState title="Reading vaults from the chain…" />
          ) : (
            <OpenVaults vaults={vaults ?? []} funder={funder} tx={tx} run={run} />
          )}
        </Panel>
        <TxFeedback pending={tx.isPending} success={tx.isSuccess} hash={tx.hash} error={tx.error} message={done} />
        <Panel title="My portfolio" flush>
          <RequireWallet why="Your positions are read from every vault you hold shares in.">
            <Portfolio vaults={vaults ?? []} tx={tx} run={run} />
          </RequireWallet>
        </Panel>
      </Stack>
      <Checklist funder={funder} tx={tx} run={run} />
    </Split>
  );
}

type Run = (msg: string, steps: Parameters<Tx["sequence"]>[0]) => void;

// ------------------------------------------------------------ open vaults

function OpenVaults({ vaults, funder, tx, run }: { vaults: VerifiedVault[]; funder: Funder; tx: Tx; run: Run }) {
  if (!vaults.length) {
    return <EmptyState title="Nothing to fund yet">Vaults appear here as soon as a seller&apos;s Faktur Pajak is verified.</EmptyState>;
  }
  // Cards hide themselves once a vault closes; the fallback shows when none are left (CSS :has).
  return (
    <>
      <ul className={p.vaults}>
        {vaults.map((v) => (
          <VaultCard key={v.vault} entry={v} funder={funder} tx={tx} run={run} />
        ))}
      </ul>
      <div className={p.fallback}>
        <EmptyState title="Nothing open right now">Every verified vault is either filled or closed. New ones appear here.</EmptyState>
      </div>
    </>
  );
}

function VaultCard({ entry, funder, tx, run }: { entry: VerifiedVault; funder: Funder; tx: Tx; run: Run }) {
  const { vault } = useVault(entry.vault);
  const number = useFakturNumber(entry.invoiceId);
  const { data: pjap } = usePjap(number);
  const { isConnected, address } = useAccount();
  const now = useNow();
  const [amount, setAmount] = useState("");

  if (!vault) return <li className={p.vault}><Skeleton height="120px" /></li>;
  // The market lists only vaults still raising money; everything else lives in portfolios.
  if (vault.state !== VAULT_STATE.Funding || now > Number(vault.fundingDeadline)) return null;

  const remaining = vault.target > vault.totalAssets ? vault.target - vault.totalAssets : 0n;
  const want = amount ? parseMockIdr(amount) : remaining;
  const ret = vault.target > 0n ? Number(((vault.nominal - vault.target) * 10_000n) / vault.target) / 100 : 0;
  const days = Math.max(0, Math.round((Number(vault.dueDate) - now) / 86400));

  const fund = () =>
    run(`Funded ${formatIdrShort(want)}. Your shares are in My portfolio.`, [
      { label: "Approving MockIDR", params: { address: addresses.mockIdr!, abi: abis.mockIdr, functionName: "approve", args: [vault.address, want] } },
      { label: "Depositing", params: { address: vault.address, abi: abis.vault, functionName: "deposit", args: [want, address] } },
    ]);

  return (
    <li className={p.vault}>
      <div className={p.vaultHead}>
        <div>
          <p className={p.buyer}>{pjap?.pembeli?.nama ?? "Verified buyer"}</p>
          <p className={p.meta}>
            <span className="mono">FP {number ?? "…"}</span> · <SimTag /> verified by PJAP
          </p>
        </div>
        <div className={p.ret}>
          <strong className="num">{ret.toFixed(2)}%</strong>
          <span>in {days} days</span>
        </div>
      </div>
      <FundingProgress raised={vault.totalAssets} target={vault.target} note={<span>Closes {formatDate(vault.fundingDeadline)}</span>} />
      <KeyValue
        items={[
          ["Invoice total", <span key="n" className="num">{formatMockIdr(vault.nominal)}</span>],
          ["Repaid to funders", <span key="r" className="num">{formatIdrShort(vault.nominal)} for {formatIdrShort(vault.target)}</span>],
          ["Held as buffer", <span key="h" className="num">{formatIdrShort(vault.holdback)} (lost only if the seller defaults)</span>],
          ["Due", formatDate(vault.dueDate)],
        ]}
      />
      <div className={p.fundRow}>
        <label className={p.amount}>
          <span className="visually-hidden">Amount in MockIDR</span>
          <span className={p.rp}>Rp</span>
          <input
            inputMode="numeric"
            placeholder={(remaining / 10n ** 18n).toLocaleString("en-US")}
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
          />
        </label>
        <Button
          size="sm"
          onClick={fund}
          disabled={!isConnected || !funder.isFunder || tx.isPending || want === 0n || want > remaining || funder.balance < want}
        >
          Fund {formatIdrShort(want)}
        </Button>
      </div>
      {isConnected && !funder.isFunder && <Muted>Register as a funder first (checklist on the right).</Muted>}
      {want > remaining && <Muted>The vault only needs {formatIdrShort(remaining)} more.</Muted>}
    </li>
  );
}

// ------------------------------------------------------------- portfolio

function Portfolio({ vaults, tx, run }: { vaults: VerifiedVault[]; tx: Tx; run: Run }) {
  if (!vaults.length) return <EmptyState title="No positions yet">Fund a vault above and it shows up here.</EmptyState>;
  return (
    <>
      <ul className={p.positions}>
        {vaults.map((v) => (
          <Position key={v.vault} entry={v} tx={tx} run={run} />
        ))}
      </ul>
      <div className={p.fallback}>
        <EmptyState title="No positions">Fund a vault above and it shows up here. Withdrawn positions drop off.</EmptyState>
      </div>
    </>
  );
}

function Position({ entry, tx, run }: { entry: VerifiedVault; tx: Tx; run: Run }) {
  const { address } = useAccount();
  const { vault } = useVault(entry.vault);
  const { invoice } = useInvoice(entry.invoiceId);
  const number = useFakturNumber(entry.invoiceId);
  const now = useNow();
  if (!vault || !invoice) return <li className={p.position}><Skeleton height="64px" /></li>;
  if (vault.shares === 0n) return null;

  const closed = vault.state === VAULT_STATE.Repaid || vault.state === VAULT_STATE.Defaulted || vault.state === VAULT_STATE.Cancelled;
  // While open, show what the position pays at repayment; once closed, what it redeems for now.
  const expected = closed ? vault.positionValue : (vault.shares * vault.nominal) / vault.target;

  return (
    <li className={p.position}>
      <div className={p.positionHead}>
        <StatusBadge status={invoice.status} />
        <span className="mono">FP {number ?? "…"}</span>
      </div>
      <KeyValue
        items={[
          ["Deposited", <span key="d" className="num">{formatMockIdr(vault.shares)}</span>],
          [closed ? "Withdrawable now" : "At repayment", <span key="e" className="num">{formatMockIdr(expected)}</span>],
          ["Vault", <Address key="v" value={vault.address} />],
        ]}
      />
      <PositionActions vault={vault} now={now} tx={tx} run={run} owner={address} />
    </li>
  );
}

function PositionActions({ vault, now, tx, run, owner }: { vault: VaultInfo; now: number; tx: Tx; run: Run; owner?: `0x${string}` }) {
  const actions: React.ReactNode[] = [];
  if (vault.maxRedeem > 0n && owner) {
    actions.push(
      <Button
        key="w"
        size="sm"
        disabled={tx.isPending}
        onClick={() =>
          run("Withdrawn to your wallet.", [
            { label: "Withdrawing", params: { address: vault.address, abi: abis.vault, functionName: "redeem", args: [vault.maxRedeem, owner, owner] } },
          ])
        }
      >
        Withdraw {formatIdrShort(vault.positionValue)}
      </Button>,
    );
  }
  if (vault.state === VAULT_STATE.Active && now < Number(vault.defaultableAt)) {
    return (
      <Muted>
        Waiting for the seller to repay by {formatDate(vault.dueDate)}. If they don&apos;t, the vault closes
        automatically after a short grace period and you withdraw the held amount. No action needed.
      </Muted>
    );
  }
  if (vault.state === VAULT_STATE.Active && now >= Number(vault.defaultableAt)) {
    return (
      <AutoClose
        kind="default"
        busy={tx.isPending}
        onManual={() =>
          run("Closed as defaulted. The held amount is now withdrawable by funders.", [
            { label: "Closing", params: { address: vault.address, abi: abis.vault, functionName: "markDefault", args: [] } },
          ])
        }
      />
    );
  }
  if (vault.state === VAULT_STATE.Funding && now > Number(vault.fundingDeadline)) {
    return (
      <AutoClose
        kind="cancel"
        busy={tx.isPending}
        onManual={() =>
          run("Funding closed. Withdraw your deposit 1:1.", [
            { label: "Closing", params: { address: vault.address, abi: abis.vault, functionName: "cancelFunding", args: [] } },
          ])
        }
      />
    );
  }
  return actions.length ? <div className={p.posActions}>{actions}</div> : null;
}

// -------------------------------------------------------------- checklist

function Checklist({ funder, tx, run }: { funder: Funder; tx: Tx; run: Run }) {
  const { address, isConnected } = useAccount();
  return (
    <Panel title="Funder checklist" flush>
      <ul className={p.checks}>
        <CheckItem ok={isConnected} label="Wallet connected" />
        <CheckItem
          ok={funder.isFunder}
          label="Registered as a funder"
          action={
            isConnected && !funder.isFunder ? (
              <Button
                size="sm"
                variant="plain"
                disabled={tx.isPending}
                onClick={() =>
                  run("Registered. You can fund vaults now.", [
                    { label: "Registering", params: { address: addresses.registry!, abi: abis.registry, functionName: "registerAsFunder", args: [] } },
                  ])
                }
              >
                Register (simulated KYC)
              </Button>
            ) : null
          }
        />
        <CheckItem
          ok={funder.balance > 0n}
          label={`Balance ${formatIdrShort(funder.balance)} MockIDR`}
          action={
            <Button
              size="sm"
              variant="plain"
              disabled={!address || tx.isPending}
              onClick={() =>
                run("Test MockIDR sent to your wallet.", [
                  { label: "Minting test MockIDR", params: { address: addresses.mockIdr!, abi: abis.mockIdr, functionName: "faucet", args: [address] } },
                ])
              }
            >
              Get test MockIDR
            </Button>
          }
        />
      </ul>
    </Panel>
  );
}

function CheckItem({ ok, label, action }: { ok: boolean; label: string; action?: React.ReactNode }) {
  return (
    <li className={p.check}>
      <span className={p.mark} data-ok={ok} aria-label={ok ? "Done" : "Not yet"}>
        {ok ? <Check size={16} weight="bold" /> : <X size={16} weight="bold" />}
      </span>
      <div className={p.checkText}>
        <span>{label}</span>
      </div>
      {action}
    </li>
  );
}
