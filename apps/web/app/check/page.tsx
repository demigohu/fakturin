"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import { FundingProgress } from "../../components/FundingProgress";
import { InvoiceNft } from "../../components/InvoiceNft";
import { RequireContracts } from "../../components/Guards";
import { Muted, PageShell } from "../../components/PageShell";
import { PjapCard } from "../../components/PjapCard";
import { Address } from "../../components/ui/Address";
import { Field } from "../../components/ui/Field";
import { Notice } from "../../components/ui/Notice";
import { Disclosure } from "../../components/ui/Disclosure";
import {
  EmptyState,
  Facts,
  KeyValue,
  Panel,
  Skeleton,
} from "../../components/ui/Panel";
import { StatusBadge, StatusTrack } from "../../components/ui/Status";
import { useInvoice, usePjap, type Invoice } from "../../hooks/useInvoice";
import { useVault } from "../../hooks/useVault";
import { abis, addresses } from "../../lib/contracts";
import {
  computeFakturId,
  formatDate,
  formatIdrx,
  normalizeFakturNumber,
  REJECT_REASON,
  STATUS,
} from "../../lib/invoice";

export default function CheckPage() {
  return (
    <PageShell
      href="/check"
      title="Check an invoice"
      lead="See whether a Faktur Pajak was verified, is being funded, or was ever financed. Public, no wallet needed."
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
          helper="Any format works: dots, dashes and replacement suffixes are ignored."
        />
      </Panel>

      {!id ? (
        <EmptyState title="Enter a Faktur Pajak number">
          You will see whether it was verified, how much of it is funded, and
          whether it was ever financed.
        </EmptyState>
      ) : isLoading || !invoice ? (
        <Panel title="Result">
          <Skeleton height="72px" />
          <Skeleton width="60%" />
        </Panel>
      ) : invoice.status === STATUS.None ? (
        <Panel title="Result" actions={<StatusBadge status={STATUS.None} />}>
          <Notice tone="info">
            Never submitted to Fakturin, so it has never been financed here.
          </Notice>
          {pjap && <PjapCard faktur={pjap} />}
          <ForDevelopers id={id} />
        </Panel>
      ) : (
        <Result invoice={invoice} pjap={pjap} />
      )}
    </>
  );
}

/** One plain-language verdict per status, for someone deciding whether to fund it. */
function verdictFor(
  invoice: Invoice,
): { tone: "info" | "success" | "error" | "pending"; text: string } | null {
  switch (invoice.status) {
    case STATUS.Pending:
      return {
        tone: "pending",
        text: "Chainlink is checking it with the tax office right now.",
      };
    case STATUS.Rejected:
      return {
        tone: "info",
        text: `Not verified: ${REJECT_REASON[invoice.rejectCode] ?? "rejected by the verifier"}.`,
      };
    case STATUS.Funding:
      return {
        tone: "success",
        text: "Verified and raising funds now. Not financed yet.",
      };
    case STATUS.Financed:
      return {
        tone: "error",
        text: "Already financed. Nobody else can finance this Faktur Pajak.",
      };
    case STATUS.Repaid:
      return {
        tone: "success",
        text: "Financed once and fully repaid. It can never be financed again.",
      };
    case STATUS.Defaulted:
      return {
        tone: "error",
        text: "Financed once and not repaid. It can never be financed again.",
      };
    case STATUS.FundingFailed:
      return {
        tone: "info",
        text: "Funding didn't fill in time; funders got their money back. It may be submitted again.",
      };
    default:
      return null;
  }
}

function Result({
  invoice,
  pjap,
}: {
  invoice: Invoice;
  pjap: ReturnType<typeof usePjap>["data"];
}) {
  const ZERO = "0x0000000000000000000000000000000000000000";
  const hasVault = invoice.vault !== ZERO;
  const { vault } = useVault(hasVault ? invoice.vault : undefined);
  const { data: flagged } = useReadContract({
    address: addresses.registry,
    abi: abis.registry,
    functionName: "sellerDefaulted",
    args: [invoice.seller],
  });
  const verdict = verdictFor(invoice);

  return (
    <Panel title="Result" actions={<StatusBadge status={invoice.status} />}>
      <StatusTrack status={invoice.status} />
      {verdict && <Notice tone={verdict.tone}>{verdict.text}</Notice>}
      {vault && invoice.status === STATUS.Funding && (
        <FundingProgress raised={vault.totalAssets} target={vault.target} />
      )}
      {hasVault && (
        <InvoiceNft invoiceId={invoice.id} vault={invoice.vault} who="public" />
      )}
      {invoice.nominal > 0n && (
        <Facts
          items={[
            ["Invoice", formatIdrx(invoice.nominal)],
            ["Due", formatDate(invoice.dueDate)],
            ["Seller record", flagged ? "Defaulted before" : "No defaults"],
          ]}
        />
      )}
      {pjap && <PjapCard faktur={pjap} parties />}
      <ForDevelopers
        id={invoice.id}
        seller={invoice.seller}
        vault={hasVault ? invoice.vault : undefined}
      />
    </Panel>
  );
}

function ForDevelopers({
  id,
  seller,
  vault,
}: {
  id: `0x${string}`;
  seller?: `0x${string}`;
  vault?: `0x${string}`;
}) {
  const items: [string, React.ReactNode][] = [
    ["Invoice ID", <Address key="id" value={id} kind="id" />],
  ];
  if (seller) items.push(["Seller wallet", <Address key="s" value={seller} />]);
  if (vault) items.push(["Vault", <Address key="v" value={vault} />]);
  return (
    <Disclosure summary="Onchain details">
      <KeyValue items={items} />
      <Muted>
        Invoice ID = keccak256(&quot;FP:&quot; + digits), so the same number in
        any format maps to one ID. Onchain the registry keeps only this ID,
        hashes, amounts and dates; names come from the tax office (PJAP).
      </Muted>
    </Disclosure>
  );
}
