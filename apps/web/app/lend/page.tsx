"use client";

import { useState } from "react";
import { Check, X } from "@phosphor-icons/react";
import { useAccount, useReadContract } from "wagmi";
import { AutoClose } from "../../components/AutoClose";
import { Glossary, PlainSteps } from "../../components/Explain";
import { FundingProgress } from "../../components/FundingProgress";
import { InvoiceNft } from "../../components/InvoiceNft";
import { Disclosure } from "../../components/ui/Disclosure";
import { RequireContracts, RequireWallet } from "../../components/Guards";
import { Muted, PageShell, Split, Stack } from "../../components/PageShell";
import { TxDialog } from "../../components/TxDialog";
import { Address } from "../../components/ui/Address";
import { Button } from "../../components/ui/Button";
import { Notice } from "../../components/ui/Notice";
import {
  EmptyState,
  Facts,
  KeyValue,
  Panel,
  SimTag,
  Skeleton,
} from "../../components/ui/Panel";
import { StatusBadge } from "../../components/ui/Status";
import { useVaults, type VerifiedVault } from "../../hooks/useEvents";
import { useIdentityIssuer } from "../../hooks/useIdentity";
import { useFakturNumber, useInvoice, usePjap } from "../../hooks/useInvoice";
import { useNow } from "../../hooks/useNow";
import { useTxFlow, type TxFlow } from "../../hooks/useTxFlow";
import {
  payoutAtRepayment,
  useVault,
  type VaultInfo,
} from "../../hooks/useVault";
import { abis, addresses } from "../../lib/contracts";
import {
  formatDate,
  formatIdrShort,
  formatIdrx,
  parseIdrx,
  VAULT_STATE,
} from "../../lib/invoice";
import {
  closePlan,
  faucetPlan,
  fundPlan,
  identityPlan,
  withdrawPlan,
} from "../../lib/txPlans";
import { UNIT } from "../../lib/token";
import p from "./pasar.module.css";

export default function MarketPage() {
  return (
    <PageShell
      href="/lend"
      title="Lend against verified invoices"
      lead="Lend to verified small businesses against tax invoices Chainlink checked with the tax office. About 16% a year, repaid per invoice."
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
    address: addresses.idrx,
    abi: abis.idrx,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled, refetchInterval: 5000 },
  });
  return {
    isFunder: funder.data === true,
    balance: typeof balance.data === "bigint" ? balance.data : 0n,
  };
}

type Funder = ReturnType<typeof useFunder>;

function MarketScreen() {
  const flow = useTxFlow();
  const funder = useFunder();
  const { data: vaults, isLoading, error } = useVaults();

  return (
    <Split>
      <Stack>
        <Panel title="Invoices looking for funders" flush>
          {error ? (
            <EmptyState title="Could not read events">
              The RPC refused the log scan. Set NEXT_PUBLIC_DEPLOY_BLOCK to the
              contract deploy block.
            </EmptyState>
          ) : isLoading ? (
            <EmptyState title="Reading vaults from the chain…" />
          ) : (
            <OpenVaults vaults={vaults ?? []} funder={funder} flow={flow} />
          )}
        </Panel>
        <Panel title="My loans" flush>
          <RequireWallet why="Your loans are read from every vault you put money into.">
            <Portfolio vaults={vaults ?? []} flow={flow} />
          </RequireWallet>
        </Panel>
      </Stack>
      <Stack>
        <Checklist funder={funder} flow={flow} />
        <Panel title="How lending works">
          <Disclosure summary="Step by step" defaultOpen={!funder.isFunder}>
            <PlainSteps
              steps={[
                {
                  head: "Pick a verified invoice",
                  body: "Each card is one Faktur Pajak, checked with the tax office before it appears here.",
                },
                {
                  head: "Lend any amount",
                  body: "Many funders share one invoice. If it isn't fully funded by the deadline, everyone gets their money back.",
                },
                {
                  head: "The seller is paid when it's full",
                  body: "80% of the invoice goes to the seller at once; 17% stays in the vault as a safety buffer.",
                },
                {
                  head: "Withdraw with your return",
                  body: "The seller pays 1.5% per 30 days. 90% of that goes to funders, split by how much each lent; 10% is the Fakturin fee. E.g. 60 days: lend Rp97M, get Rp99.7M back.",
                },
              ]}
            />
          </Disclosure>
          <Notice tone="info">
            Risk: if the seller doesn&apos;t repay, funders share only the
            safety buffer (about 17%). <SimTag /> All amounts are test money.
          </Notice>
          <Glossary />
        </Panel>
      </Stack>
      <TxDialog flow={flow} />
    </Split>
  );
}

// ------------------------------------------------------------ open vaults

function OpenVaults({
  vaults,
  funder,
  flow,
}: {
  vaults: VerifiedVault[];
  funder: Funder;
  flow: TxFlow;
}) {
  if (!vaults.length) {
    return (
      <EmptyState title="Nothing to fund yet">
        Invoices appear here as soon as a seller&apos;s Faktur Pajak is
        verified.
      </EmptyState>
    );
  }
  // Cards hide themselves once a vault closes; the fallback shows when none are left (CSS :has).
  return (
    <>
      <ul className={p.vaults}>
        {vaults.map((v) => (
          <VaultCard key={v.vault} entry={v} funder={funder} flow={flow} />
        ))}
      </ul>
      <div className={p.fallback}>
        <EmptyState title="Nothing open right now">
          Every verified invoice is either fully funded or closed. New ones
          appear here.
        </EmptyState>
      </div>
    </>
  );
}

function VaultCard({
  entry,
  funder,
  flow,
}: {
  entry: VerifiedVault;
  funder: Funder;
  flow: TxFlow;
}) {
  const { vault } = useVault(entry.vault);
  const number = useFakturNumber(entry.invoiceId);
  const { data: pjap } = usePjap(number);
  const { isConnected, address } = useAccount();
  const now = useNow();
  const [amount, setAmount] = useState("");

  if (!vault)
    return (
      <li className={p.vault}>
        <Skeleton height="120px" />
      </li>
    );
  // The market lists only vaults still raising money; everything else lives in portfolios.
  if (
    vault.state !== VAULT_STATE.Funding ||
    now > Number(vault.fundingDeadline)
  )
    return null;

  const remaining =
    vault.target > vault.totalAssets ? vault.target - vault.totalAssets : 0n;
  const want = amount ? parseIdrx(amount) : remaining;
  const back = payoutAtRepayment(want, vault);
  const sellerCost = vault.nominal - vault.target;
  const ret =
    vault.target > 0n
      ? Number(((sellerCost - vault.fee) * 10_000n) / vault.target) / 100
      : 0;
  const days = Math.max(0, Math.round((Number(vault.dueDate) - now) / 86400));
  const blocked = !isConnected
    ? "Connect your wallet to lend."
    : !funder.isFunder
      ? "Verify your identity first (checklist on the right)."
      : want > remaining
        ? `This invoice only needs ${formatIdrShort(remaining)} more.`
        : funder.balance < want
          ? 'Not enough MockIDRX. Use "Get test MockIDRX" on the right.'
          : null;

  return (
    <li className={p.vault}>
      <div className={p.vaultHead}>
        <div>
          <p className={p.buyer}>{pjap?.penjual?.nama ?? "Verified seller"}</p>
          <p className={p.meta}>
            invoice to {pjap?.pembeli?.nama ?? "a verified buyer"} ·{" "}
            <span className="mono">FP {number ?? "…"}</span> · <SimTag />{" "}
            checked with the tax office
          </p>
        </div>
        <div className={p.ret}>
          <strong className="num">+{ret.toFixed(2)}%</strong>
          <span>return in {days} days</span>
        </div>
      </div>
      <Facts
        items={[
          ["Invoice", formatIdrShort(vault.nominal)],
          ["Still needed", formatIdrShort(remaining)],
          ["Seller repays by", formatDate(vault.dueDate)],
        ]}
      />
      <FundingProgress
        raised={vault.totalAssets}
        target={vault.target}
        note={<span>Closes {formatDate(vault.fundingDeadline)}</span>}
      />
      <div className={p.fundRow}>
        <label className={p.amount}>
          <span className="visually-hidden">Amount to lend in MockIDRX</span>
          <span className={p.rp}>Rp</span>
          <input
            inputMode="numeric"
            placeholder={(remaining / UNIT).toLocaleString("en-US")}
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
          />
        </label>
        <Button
          size="sm"
          disabled={Boolean(blocked) || flow.busy || want === 0n || !address}
          onClick={() =>
            address &&
            flow.start(
              fundPlan({
                vault: vault.address,
                owner: address,
                amount: want,
                nominal: vault.nominal,
                target: vault.target,
                holdback: vault.holdback,
                advance: vault.advance,
                remaining,
                fee: vault.fee,
                dueDate: vault.dueDate,
                buyer: pjap?.pembeli?.nama,
                number,
              }),
            )
          }
        >
          Review: lend {formatIdrShort(want)}
        </Button>
      </div>
      {want > 0n && want <= remaining && (
        <Muted>
          Lend {formatIdrx(want)}, get back {formatIdrx(back)} when the seller
          repays. Leave the box empty to fund everything that&apos;s left.
        </Muted>
      )}
      {blocked && <Muted>{blocked}</Muted>}
      <Disclosure summary="Details: where the return comes from, risk, invoice NFT">
        <KeyValue
          items={[
            [
              "Funders lend",
              <span key="t" className="num">
                {formatIdrx(vault.target)} in total
              </span>,
            ],
            [
              "Funders get back",
              <span key="r" className="num">
                {formatIdrx(vault.nominal - vault.fee)} when the seller repays
              </span>,
            ],
            [
              "Seller's cost",
              <span key="c" className="num">
                {formatIdrShort(sellerCost)}:{" "}
                {formatIdrShort(sellerCost - vault.fee)} to funders,{" "}
                {formatIdrShort(vault.fee)} Fakturin fee
              </span>,
            ],
            [
              "If not repaid",
              <span key="h" className="num">
                funders share the {formatIdrShort(vault.holdback)} buffer
              </span>,
            ],
          ]}
        />
        <InvoiceNft
          invoiceId={entry.invoiceId}
          vault={vault.address}
          who="funder"
        />
      </Disclosure>
    </li>
  );
}

// ------------------------------------------------------------- portfolio

function Portfolio({
  vaults,
  flow,
}: {
  vaults: VerifiedVault[];
  flow: TxFlow;
}) {
  if (!vaults.length)
    return (
      <EmptyState title="No loans yet">
        Lend to an invoice above and it shows up here.
      </EmptyState>
    );
  return (
    <>
      <ul className={p.positions}>
        {vaults.map((v) => (
          <Position key={v.vault} entry={v} flow={flow} />
        ))}
      </ul>
      <div className={p.fallback}>
        <EmptyState title="No loans">
          Lend to an invoice above and it shows up here. Withdrawn loans drop
          off.
        </EmptyState>
      </div>
    </>
  );
}

function Position({ entry, flow }: { entry: VerifiedVault; flow: TxFlow }) {
  const { address } = useAccount();
  const { vault } = useVault(entry.vault);
  const { invoice } = useInvoice(entry.invoiceId);
  const number = useFakturNumber(entry.invoiceId);
  const now = useNow();
  if (!vault || !invoice)
    return (
      <li className={p.position}>
        <Skeleton height="64px" />
      </li>
    );
  if (vault.shares === 0n) return null;

  const closed =
    vault.state === VAULT_STATE.Repaid ||
    vault.state === VAULT_STATE.Defaulted ||
    vault.state === VAULT_STATE.Cancelled;
  // While open, show what the position pays at repayment; once closed, what it redeems for now.
  const expected = closed
    ? vault.positionValue
    : payoutAtRepayment(vault.shares, vault);

  return (
    <li className={p.position}>
      <div className={p.positionHead}>
        <StatusBadge status={invoice.status} />
        <span className="mono">FP {number ?? "…"}</span>
      </div>
      <KeyValue
        items={[
          [
            "You lent",
            <span key="d" className="num">
              {formatIdrx(vault.shares)}
            </span>,
          ],
          [
            closed ? "You can withdraw now" : "You get back when repaid",
            <span key="e" className="num">
              {formatIdrx(expected)}
            </span>,
          ],
          ["Vault", <Address key="v" value={vault.address} />],
        ]}
      />
      <PositionActions vault={vault} now={now} flow={flow} owner={address} />
    </li>
  );
}

const WITHDRAW_WHY: Record<number, string> = {
  [VAULT_STATE.Repaid]:
    "The seller repaid the invoice. Your part includes your return.",
  [VAULT_STATE.Defaulted]:
    "The seller did not repay. This is your share of the safety buffer that was held in the vault.",
  [VAULT_STATE.Cancelled]:
    "The invoice wasn't fully funded in time, so every deposit is returned in full.",
};

function PositionActions({
  vault,
  now,
  flow,
  owner,
}: {
  vault: VaultInfo;
  now: number;
  flow: TxFlow;
  owner?: `0x${string}`;
}) {
  if (vault.maxRedeem > 0n && owner) {
    return (
      <div className={p.posActions}>
        <Button
          size="sm"
          disabled={flow.busy}
          onClick={() =>
            flow.start(
              withdrawPlan({
                vault: vault.address,
                owner,
                shares: vault.maxRedeem,
                value: vault.positionValue,
                why:
                  WITHDRAW_WHY[vault.state] ??
                  "Take your money out of the vault.",
              }),
            )
          }
        >
          Withdraw {formatIdrShort(vault.positionValue)}
        </Button>
      </div>
    );
  }
  if (
    vault.state === VAULT_STATE.Funding &&
    now <= Number(vault.fundingDeadline)
  ) {
    return (
      <Muted>
        Waiting for other funders to fill this invoice. If it isn&apos;t full by
        the deadline, you get everything back.
      </Muted>
    );
  }
  if (vault.state === VAULT_STATE.Active && now < Number(vault.defaultableAt)) {
    return (
      <Muted>
        The seller has been paid and repays by {formatDate(vault.dueDate)}. If
        they don&apos;t, the vault closes automatically after a short grace
        period and you withdraw your share of the buffer. No action needed.
      </Muted>
    );
  }
  if (vault.state === VAULT_STATE.Active) {
    return (
      <AutoClose
        kind="default"
        busy={flow.busy}
        onManual={() => flow.start(closePlan(vault.address, "default"))}
      />
    );
  }
  if (vault.state === VAULT_STATE.Funding) {
    return (
      <AutoClose
        kind="cancel"
        busy={flow.busy}
        onManual={() => flow.start(closePlan(vault.address, "cancel"))}
      />
    );
  }
  return null;
}

// -------------------------------------------------------------- checklist

function Checklist({ funder, flow }: { funder: Funder; flow: TxFlow }) {
  const { address, isConnected } = useAccount();
  const { sign, issue } = useIdentityIssuer("kyc");
  return (
    <Panel title="Before you lend" flush>
      <ul className={p.checks}>
        <CheckItem ok={isConnected} label="Wallet connected" />
        <CheckItem
          ok={funder.isFunder}
          label="Identity verified (KYC)"
          hint="A verification provider (simulated) issues a Chainlink ACE credential to your wallet. Vaults only accept money from verified wallets."
          action={
            isConnected && !funder.isFunder ? (
              <Button
                size="sm"
                variant="plain"
                disabled={flow.busy}
                onClick={() =>
                  flow.start(identityPlan({ kind: "kyc", sign, issue }))
                }
              >
                Verify identity
              </Button>
            ) : null
          }
        />
        <CheckItem
          ok={funder.balance > 0n}
          label={`Balance ${formatIdrShort(funder.balance)} MockIDRX`}
          hint="MockIDRX is pretend rupiah for this demo."
          action={
            <Button
              size="sm"
              variant="plain"
              disabled={!address || flow.busy}
              onClick={() =>
                address &&
                flow.start(
                  faucetPlan(address, "You lend it to invoices on this page."),
                )
              }
            >
              Get test MockIDRX
            </Button>
          }
        />
      </ul>
    </Panel>
  );
}

function CheckItem({
  ok,
  label,
  hint,
  action,
}: {
  ok: boolean;
  label: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <li className={p.check}>
      <span
        className={p.mark}
        data-ok={ok}
        aria-label={ok ? "Done" : "Not yet"}
      >
        {ok ? <Check size={16} weight="bold" /> : <X size={16} weight="bold" />}
      </span>
      <div className={p.checkText}>
        <span>{label}</span>
        {hint && <span className={p.hint}>{hint}</span>}
      </div>
      {action}
    </li>
  );
}
