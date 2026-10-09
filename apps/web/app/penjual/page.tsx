"use client";

import { useEffect, useState } from "react";
import type { Address as Addr } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { FundingProgress } from "../../components/FundingProgress";
import { AutoClose } from "../../components/AutoClose";
import { RequireContracts, RequireWallet } from "../../components/Guards";
import { Muted, PageShell, Split, Stack } from "../../components/PageShell";
import { PjapCard } from "../../components/PjapCard";
import { Address } from "../../components/ui/Address";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Notice, TxFeedback } from "../../components/ui/Notice";
import { EmptyState, KeyValue, Panel, SimTag, Skeleton, Stat, StatGrid } from "../../components/ui/Panel";
import { StatusBadge } from "../../components/ui/Status";
import { useSellerInvoices } from "../../hooks/useEvents";
import { splitNominal, useFakturNumber, useInvoice, usePjap, useRegistryParams } from "../../hooks/useInvoice";
import { useNow } from "../../hooks/useNow";
import { useTx } from "../../hooks/useTx";
import { useVault } from "../../hooks/useVault";
import { abis, addresses } from "../../lib/contracts";
import {
  computeFakturId,
  formatDate,
  formatIdrShort,
  normalizeFakturNumber,
  REJECT_REASON,
  STATUS,
  VAULT_STATE,
} from "../../lib/invoice";
import { demoNumbers } from "../../lib/pjap";
import p from "./seller.module.css";

export default function SellerPage() {
  return (
    <PageShell
      href="/penjual"
      title="Get paid today"
      lead="Enter a Faktur Pajak number. Chainlink CRE checks it with the tax system, a funding vault opens, and 80% of the invoice reaches you as soon as funders fill it."
    >
      <RequireContracts>
        <SellerScreen />
      </RequireContracts>
    </PageShell>
  );
}

type Tx = ReturnType<typeof useTx>;

function SellerScreen() {
  const { address } = useAccount();
  const tx = useTx();
  const [done, setDone] = useState("");

  return (
    <Split>
      <Stack>
        <SubmitPanel tx={tx} onDone={setDone} />
        <TxFeedback pending={tx.isPending} success={tx.isSuccess} hash={tx.hash} error={tx.error} message={done} />
        <Panel title="Your invoices" flush>
          <RequireWallet why="Your invoices are read from VerificationRequested events for this wallet.">
            {address && <SellerInvoices seller={address} tx={tx} onDone={setDone} />}
          </RequireWallet>
        </Panel>
      </Stack>
      <SellerSidebar tx={tx} onDone={setDone} />
    </Split>
  );
}

// ------------------------------------------------------------------ submit

function SubmitPanel({ tx, onDone }: { tx: Tx; onDone: (m: string) => void }) {
  const { address } = useAccount();
  const params = useRegistryParams();
  const [number, setNumber] = useState("");
  const [verifying, setVerifying] = useState<`0x${string}` | null>(null);
  const [rejected, setRejected] = useState<string | null>(null);
  // Generated after mount (random per visit) so server and client render the same markup.
  const [samples, setSamples] = useState<{ valid: string[]; dueSoon: string; cancelled: string }>();
  useEffect(() => {
    const [a, b, c, d, e] = demoNumbers(5);
    setSamples({ valid: [a!, b!, c!], dueSoon: `${d!.slice(0, 10)}7777`, cancelled: `${e!.slice(0, 10)}9999` });
  }, []);

  const digits = normalizeFakturNumber(number);
  const formatError = number && (digits.length < 13 || digits.length > 17) ? "A Faktur Pajak number has 13 to 17 digits" : null;
  const { data: pjap, isFetching } = usePjap(formatError ? undefined : digits);
  const id = computeFakturId(number);
  const { invoice } = useInvoice(id, { poll: Boolean(verifying) });

  const split =
    pjap?.status === "VALID" && params.discountBps !== undefined && params.advanceBps !== undefined
      ? splitNominal(BigInt(pjap.total!) * 10n ** 18n, params.discountBps, params.advanceBps)
      : undefined;

  const taken =
    invoice &&
    invoice.status !== STATUS.None &&
    invoice.status !== STATUS.Rejected &&
    invoice.status !== STATUS.FundingFailed &&
    verifying !== id;

  async function submit() {
    if (!address || !id) return;
    onDone("");
    setRejected(null);
    setVerifying(id);
    try {
      await tx.sequence([
        {
          label: "Submitting",
          params: { address: addresses.registry!, abi: abis.registry, functionName: "requestVerification", args: [number] },
        },
      ]);
      // The demo relayer runs the same check the Chainlink CRE workflow runs.
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invoiceId: id }),
      });
      const result = res.ok ? ((await res.json()) as { invoiceStatus?: number; rejectCode?: number }) : null;
      if (result?.invoiceStatus === STATUS.Funding) {
        onDone("Verified. Your funding vault is open below.");
        setNumber("");
      } else if (result?.invoiceStatus === STATUS.Rejected) {
        setRejected(REJECT_REASON[result.rejectCode ?? 0] ?? "Rejected by the verifier.");
      } else {
        onDone("Submitted. Waiting for the Chainlink CRE verifier to write the result.");
      }
    } catch {
      /* decoded error is shown by TxFeedback */
    } finally {
      setVerifying(null);
    }
  }

  return (
    <Panel title="Submit a Faktur Pajak">
      <Field
        label="Faktur Pajak number"
        value={number}
        onChange={setNumber}
        placeholder="04002600012345"
        mono
        inputMode="numeric"
        error={formatError}
        helper="The number printed on your Faktur Pajak (Coretax). Dots and dashes are ignored."
      />
      {samples && (
        <div className={p.samples}>
          <span>Demo numbers:</span>
          {samples.valid.map((n) => (
            <button key={n} type="button" onClick={() => setNumber(n)}>
              {n}
            </button>
          ))}
          <button type="button" onClick={() => setNumber(samples.dueSoon)} title="Due in 2 minutes: lets you demo a default">
            due in 2 min
          </button>
          <button type="button" onClick={() => setNumber(samples.cancelled)} title="Cancelled at the tax office">
            cancelled
          </button>
        </div>
      )}

      {isFetching && <Skeleton height="96px" />}
      {pjap && !isFetching && <PjapCard faktur={pjap} />}

      {split && (
        <StatGrid>
          <Stat label="Paid to you when funded" value={formatIdrShort(split.advance)} />
          <Stat label="Held until you repay" value={formatIdrShort(split.holdback)} />
          <Stat label="Your cost" value={formatIdrShort(split.yieldAmount)} />
        </StatGrid>
      )}

      {taken && (
        <Notice tone="error">This Faktur Pajak is already registered. One number can only be financed once.</Notice>
      )}

      <div>
        <Button
          onClick={submit}
          disabled={!address || !id || pjap?.status !== "VALID" || Boolean(taken) || tx.isPending}
          loading={Boolean(verifying)}
        >
          Verify &amp; open funding
        </Button>
      </div>
      {!address && <Muted>Connect the seller wallet to submit.</Muted>}
      {verifying && (
        <Muted>
          {tx.step ?? "Verifying with PJAP through the verifier"}… this usually takes a few seconds.
        </Muted>
      )}
      {rejected && <Notice tone="error">Not verified: {rejected}.</Notice>}
    </Panel>
  );
}

// ------------------------------------------------------------------ list

function SellerInvoices({ seller, tx, onDone }: { seller: Addr; tx: Tx; onDone: (m: string) => void }) {
  const { data: ids, isLoading, error } = useSellerInvoices(seller);
  if (error) {
    return (
      <EmptyState title="Could not read events">
        The RPC refused the log scan. Set NEXT_PUBLIC_DEPLOY_BLOCK to the contract deploy block.
      </EmptyState>
    );
  }
  if (isLoading) return <EmptyState title="Reading your invoices from the chain…" />;
  if (!ids?.length) {
    return <EmptyState title="No invoices yet">Submit a Faktur Pajak above. It shows up here with its funding progress.</EmptyState>;
  }
  return (
    <ul className={p.list}>
      {ids.map((id) => (
        <SellerInvoice key={id} id={id} tx={tx} onDone={onDone} />
      ))}
    </ul>
  );
}

function SellerInvoice({ id, tx, onDone }: { id: `0x${string}`; tx: Tx; onDone: (m: string) => void }) {
  const { invoice, hasVault } = useInvoice(id, { poll: true });
  const number = useFakturNumber(id);
  const { data: pjap } = usePjap(number);
  const { vault } = useVault(hasVault ? invoice!.vault : undefined);
  const now = useNow();

  if (!invoice) {
    return (
      <li className={p.row}>
        <Skeleton width="50%" />
      </li>
    );
  }

  const run = (msg: string, steps: Parameters<Tx["sequence"]>[0]) => {
    onDone("");
    tx.sequence(steps)
      .then(() => onDone(msg))
      .catch(() => undefined);
  };

  const repay = () =>
    run("Repaid. Funders can withdraw and your held amount is back in your wallet.", [
      {
        label: "Approving MockIDR",
        params: { address: addresses.mockIdr!, abi: abis.mockIdr, functionName: "approve", args: [invoice.vault, invoice.nominal] },
      },
      { label: "Repaying", params: { address: invoice.vault, abi: abis.vault, functionName: "repay", args: [] } },
    ]);

  const cancel = () =>
    run("Funding closed. Funders get their deposits back; you can submit this Faktur Pajak again.", [
      { label: "Closing", params: { address: invoice.vault, abi: abis.vault, functionName: "cancelFunding", args: [] } },
    ]);

  const closeDefaulted = () =>
    run("Closed as defaulted.", [
      { label: "Closing", params: { address: invoice.vault, abi: abis.vault, functionName: "markDefault", args: [] } },
    ]);

  return (
    <li className={p.row}>
      <div className={p.rowHead}>
        <StatusBadge status={invoice.status} />
        <span className="mono">{number ?? "…"}</span>
        {pjap?.pembeli && <span className={p.buyer}>{pjap.pembeli.nama}</span>}
      </div>

      {invoice.status === STATUS.Rejected && (
        <Notice tone="error">{REJECT_REASON[invoice.rejectCode] ?? "Rejected by the verifier"}</Notice>
      )}

      {vault && invoice.status === STATUS.Funding && (
        <FundingProgress
          raised={vault.totalAssets}
          target={vault.target}
          note={<span>Closes {formatDate(vault.fundingDeadline)}</span>}
        />
      )}

      {vault && invoice.status !== STATUS.Pending && invoice.status !== STATUS.Rejected && (
        <KeyValue
          items={[
            ["Invoice total", <span key="n" className="num">{formatIdrShort(invoice.nominal)}</span>],
            ["Paid to you", <span key="a" className="num">{vault.state >= VAULT_STATE.Active && vault.state !== VAULT_STATE.Cancelled ? formatIdrShort(vault.advance) : "On funding"}</span>],
            ["Due", formatDate(invoice.dueDate)],
            ["Vault", <Address key="v" value={invoice.vault} />],
          ]}
        />
      )}

      <div className={p.actions}>
        {invoice.status === STATUS.Financed && (
          <Button size="sm" onClick={repay} disabled={tx.isPending}>
            Repay {formatIdrShort(invoice.nominal)}
          </Button>
        )}
      </div>
      {invoice.status === STATUS.Funding && vault && now > Number(vault.fundingDeadline) && (
        <AutoClose kind="cancel" onManual={cancel} busy={tx.isPending} />
      )}
      {invoice.status === STATUS.Financed && vault && now >= Number(vault.defaultableAt) && (
        <AutoClose kind="default" onManual={closeDefaulted} busy={tx.isPending} />
      )}
    </li>
  );
}

// ------------------------------------------------------------------ sidebar

function SellerSidebar({ tx, onDone }: { tx: Tx; onDone: (m: string) => void }) {
  const { address } = useAccount();
  const params = useRegistryParams();
  const enabled = Boolean(address);
  const { data: outstanding } = useReadContract({
    address: addresses.registry,
    abi: abis.registry,
    functionName: "sellerOutstanding",
    args: address ? [address] : undefined,
    query: { enabled },
  });
  const { data: balance } = useReadContract({
    address: addresses.mockIdr,
    abi: abis.mockIdr,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled, refetchInterval: 5000 },
  });
  const { data: flagged } = useReadContract({
    address: addresses.registry,
    abi: abis.registry,
    functionName: "sellerDefaulted",
    args: address ? [address] : undefined,
    query: { enabled },
  });

  return (
    <Stack>
      <Panel title="Your position" flush>
        <StatGrid cols={1}>
          <Stat label="MockIDR balance" value={typeof balance === "bigint" ? formatIdrShort(balance) : "-"} />
          <Stat
            label="Outstanding / seller limit"
            value={
              typeof outstanding === "bigint" && params.sellerLimit !== undefined
                ? `${formatIdrShort(outstanding)} / ${formatIdrShort(params.sellerLimit)}`
                : "-"
            }
          />
        </StatGrid>
        <div className={p.sidePad}>
          {flagged === true && <Notice tone="error">This wallet defaulted on an invoice and can no longer submit.</Notice>}
          <Button
            size="sm"
            variant="plain"
            block
            disabled={!address || tx.isPending}
            onClick={() => {
              onDone("");
              tx.sequence([
                { label: "Minting test MockIDR", params: { address: addresses.mockIdr!, abi: abis.mockIdr, functionName: "faucet", args: [address] } },
              ])
                .then(() => onDone("Test MockIDR sent to your wallet, so you can repay in the demo."))
                .catch(() => undefined);
            }}
          >
            Get test MockIDR
          </Button>
        </div>
      </Panel>
      <Panel title="How it works">
        <ol className={p.steps}>
          <li>Enter your Faktur Pajak number and sign once.</li>
          <li>Chainlink CRE checks it with PJAP and opens a vault for it.</li>
          <li>Funders fill the vault. 80% of the invoice reaches you right away.</li>
          <li>When your buyer pays you, repay the vault. The held amount comes back to you.</li>
        </ol>
        <Notice tone="info">
          <SimTag /> PJAP data and MockIDR are simulated. Your buyer never has to use this app.
        </Notice>
      </Panel>
    </Stack>
  );
}
