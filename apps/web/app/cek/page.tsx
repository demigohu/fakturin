"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import { FundingProgress } from "../../components/FundingProgress";
import { RequireContracts } from "../../components/Guards";
import { Muted, PageShell } from "../../components/PageShell";
import { PjapCard } from "../../components/PjapCard";
import { Address } from "../../components/ui/Address";
import { Field } from "../../components/ui/Field";
import { Notice } from "../../components/ui/Notice";
import { EmptyState, KeyValue, Panel, Skeleton } from "../../components/ui/Panel";
import { StatusBadge, StatusTrack } from "../../components/ui/Status";
import { useInvoice, usePjap, type Invoice } from "../../hooks/useInvoice";
import { useVault } from "../../hooks/useVault";
import { abis, addresses } from "../../lib/contracts";
import { computeFakturId, formatDate, formatMockIdr, normalizeFakturNumber, REJECT_REASON, STATUS } from "../../lib/invoice";

export default function CheckPage() {
  return (
    <PageShell
      href="/cek"
      title="Check an invoice"
      lead="Before funding anything, see whether a Faktur Pajak is already registered or financed. The registry is public and keyed by the tax invoice number, no wallet needed."
    >
      <RequireContracts>
        <Lookup />
      </RequireContracts>
    </PageShell>
  );
}

function Lookup() {
  const [number, setNumber] = useState("");
  const digits = normalizeFakturNumber(number);
  const id = digits.length >= 13 ? computeFakturId(number) : undefined;
  const { invoice, isLoading } = useInvoice(id);
  const { data: pjap } = usePjap(id ? digits : undefined);

  return (
    <>
      <Panel title="Find a Faktur Pajak">
        <Field
          label="Faktur Pajak number"
          value={number}
          onChange={setNumber}
          placeholder="04002600012345"
          mono
          inputMode="numeric"
          helper={'Invoice ID = keccak256("FP:" + digits). The same number in any format, including replacement suffixes, maps to one ID.'}
        />
      </Panel>

      {!id ? (
        <EmptyState title="Enter a Faktur Pajak number">
          You will see whether it was verified, how much of it is funded, and whether it was ever financed.
        </EmptyState>
      ) : isLoading || !invoice ? (
        <Panel title="Result">
          <Skeleton height="72px" />
          <Skeleton width="60%" />
        </Panel>
      ) : invoice.status === STATUS.None ? (
        <Panel title="Result" actions={<StatusBadge status={STATUS.None} />}>
          <Notice tone="info">
            This Faktur Pajak was never submitted to Fakturin, so it has never been financed here.
          </Notice>
          {pjap && <PjapCard faktur={pjap} />}
          <KeyValue items={[["Invoice ID", <Address key="id" value={id} kind="id" />]]} />
        </Panel>
      ) : (
        <Result invoice={invoice} pjap={pjap} />
      )}
    </>
  );
}

function Result({ invoice, pjap }: { invoice: Invoice; pjap: ReturnType<typeof usePjap>["data"] }) {
  const ZERO = "0x0000000000000000000000000000000000000000";
  const { vault } = useVault(invoice.vault !== ZERO ? invoice.vault : undefined);
  const { data: flagged } = useReadContract({
    address: addresses.registry,
    abi: abis.registry,
    functionName: "sellerDefaulted",
    args: [invoice.seller],
  });

  const verdict =
    invoice.status === STATUS.Financed
      ? { tone: "error" as const, text: "Already financed. Nobody else can finance this Faktur Pajak." }
      : invoice.status === STATUS.Funding
        ? { tone: "success" as const, text: "Verified and raising funds. Not financed yet." }
        : invoice.status === STATUS.Repaid || invoice.status === STATUS.Defaulted
          ? { tone: "error" as const, text: "Financed before. This number can never be financed again." }
          : invoice.status === STATUS.Rejected
            ? { tone: "info" as const, text: REJECT_REASON[invoice.rejectCode] ?? "Rejected by the verifier." }
            : invoice.status === STATUS.Pending
              ? { tone: "info" as const, text: "Waiting for the verifier." }
              : null;

  return (
    <Panel title="Result" actions={<StatusBadge status={invoice.status} />}>
      <StatusTrack status={invoice.status} />
      {verdict && <Notice tone={verdict.tone}>{verdict.text}</Notice>}
      {vault && invoice.status === STATUS.Funding && <FundingProgress raised={vault.totalAssets} target={vault.target} />}
      {pjap && <PjapCard faktur={pjap} />}
      <KeyValue
        items={[
          ["Invoice ID", <Address key="id" value={invoice.id} kind="id" />],
          ["Seller wallet", <Address key="s" value={invoice.seller} />],
          ["Seller record", flagged ? "Defaulted before" : "No defaults"],
          ["Vault", invoice.vault !== ZERO ? <Address key="v" value={invoice.vault} /> : "Not opened"],
          ["Amount onchain", invoice.nominal > 0n ? <span key="n" className="num">{formatMockIdr(invoice.nominal)}</span> : "-"],
          ["Due date", invoice.dueDate > 0n ? formatDate(invoice.dueDate) : "-"],
        ]}
      />
      <Muted>Onchain the registry stores only hashes, amounts and dates. Names come from PJAP.</Muted>
    </Panel>
  );
}
