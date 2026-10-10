"use client";

import { useEffect, useState } from "react";
import type { Address as Addr } from "viem";
import { useAccount, usePublicClient, useReadContract } from "wagmi";
import { AutoClose } from "../../components/AutoClose";
import { Glossary, PlainSteps } from "../../components/Explain";
import { FundingProgress } from "../../components/FundingProgress";
import { InvoiceNft, NftThumb } from "../../components/InvoiceNft";
import { RequireContracts, RequireWallet } from "../../components/Guards";
import { Muted, PageShell, Split, Stack } from "../../components/PageShell";
import { PjapCard } from "../../components/PjapCard";
import { TxDialog } from "../../components/TxDialog";
import { Address } from "../../components/ui/Address";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Notice } from "../../components/ui/Notice";
import { Disclosure } from "../../components/ui/Disclosure";
import {
  EmptyState,
  Facts,
  KeyValue,
  Panel,
  SimTag,
  Skeleton,
  Stat,
  StatGrid,
} from "../../components/ui/Panel";
import { StatusBadge } from "../../components/ui/Status";
import { useFundedTx, useSellerInvoices } from "../../hooks/useEvents";
import {
  useIdentity,
  useIdentityIssuer,
  usePjapAccount,
} from "../../hooks/useIdentity";
import {
  priceInvoice,
  useFakturNumber,
  useInvoice,
  usePjap,
  useRegistryParams,
} from "../../hooks/useInvoice";
import { useNow } from "../../hooks/useNow";
import { useTxFlow, type TxFlow } from "../../hooks/useTxFlow";
import { useVault } from "../../hooks/useVault";
import { CRE_MODE } from "../../lib/automation";
import { abis, addresses } from "../../lib/contracts";
import {
  computeFakturId,
  EXPLORER,
  formatDate,
  formatIdrShort,
  normalizeFakturNumber,
  REJECT_REASON,
  shortHex,
  STATUS,
} from "../../lib/invoice";
import {
  fakturNumbersFor,
  maskNpwp,
  npwpHash,
  type PjapAccount,
} from "../../lib/pjap";
import {
  closePlan,
  faucetPlan,
  identityPlan,
  repayPlan,
  submitPlan,
} from "../../lib/txPlans";
import { UNIT } from "../../lib/token";
import p from "./seller.module.css";

export default function SellerPage() {
  return (
    <PageShell
      href="/borrow"
      title="Get paid today"
      lead="Borrow against a Faktur Pajak: funders pay you 80% of it now, and you repay when your customer pays you."
    >
      <RequireContracts>
        <SellerScreen />
      </RequireContracts>
    </PageShell>
  );
}

type Identity = ReturnType<typeof useIdentity>;

function SellerScreen() {
  const { address } = useAccount();
  const flow = useTxFlow();
  const identity = useIdentity();
  const { data: account } = usePjapAccount(address);
  const needsKyb = Boolean(address) && !identity.loading && !identity.isSeller;

  return (
    <Split>
      <Stack>
        {needsKyb ? (
          <VerifyBusiness flow={flow} account={account} />
        ) : (
          <SubmitPanel flow={flow} account={account} identity={identity} />
        )}
        <Panel title="Your invoices" flush>
          <RequireWallet why="Your invoices are read from the blockchain for this wallet.">
            {address && <SellerInvoices seller={address} flow={flow} />}
          </RequireWallet>
        </Panel>
      </Stack>
      <SellerSidebar flow={flow} account={account} identity={identity} />
      <TxDialog flow={flow} />
    </Split>
  );
}

// ---------------------------------------------------------------- KYB

function VerifyBusiness({
  flow,
  account,
}: {
  flow: TxFlow;
  account?: PjapAccount;
}) {
  const { sign, issue } = useIdentityIssuer("kyb");
  return (
    <Panel title="First, verify your business" tag="Step 1 of 2">
      <p className={p.lead}>
        Only verified businesses can finance invoices, and only their own. Do it
        once: a verification provider checks your tax account and records the
        result on this wallet as a <strong>Chainlink ACE</strong> credential.
      </p>
      <div className={p.account}>
        <p className={p.accountHead}>
          <SimTag /> Tax account linked to this wallet (PJAP)
        </p>
        {account ? (
          <KeyValue
            items={[
              ["Business", account.nama],
              [
                "NPWP",
                <span key="n" className="mono">
                  {maskNpwp(account.npwp)}
                </span>,
              ],
              ["Status", "PKP (VAT-registered), active"],
            ]}
          />
        ) : (
          <Skeleton height="72px" />
        )}
      </div>
      <div>
        <Button
          disabled={!account || flow.busy}
          onClick={() =>
            account &&
            flow.start(
              identityPlan({
                kind: "kyb",
                sign,
                issue,
                business: {
                  nama: account.nama,
                  npwpMasked: maskNpwp(account.npwp),
                },
              }),
            )
          }
        >
          Review and verify business
        </Button>
      </div>
      <Disclosure summary="What gets stored onchain">
        <Muted>
          A Cross-Chain ID for this wallet with two credentials: business
          verified (common.kyb) and VAT-registered with a hash of this NPWP
          (id.fakturin.pkp). The NPWP itself never goes onchain.
        </Muted>
      </Disclosure>
    </Panel>
  );
}

// ------------------------------------------------------------------ submit

type Samples = {
  mine: string[];
  dueSoon: string;
  cancelled: string;
  other: string;
};

function otherCode(code: string): string {
  return String((Number(code) + 37_111) % 100_000).padStart(5, "0");
}

function SubmitPanel({
  flow,
  account,
  identity,
}: {
  flow: TxFlow;
  account?: PjapAccount;
  identity: Identity;
}) {
  const { address } = useAccount();
  const client = usePublicClient();
  const params = useRegistryParams();
  const now = useNow();
  const [number, setNumber] = useState("");
  // Generated after mount (random serials per visit) so server and client render the same markup.
  const [samples, setSamples] = useState<Samples>();
  useEffect(() => {
    if (!account) return;
    const [a, b, c, d, e] = fakturNumbersFor(account.sellerCode, 5);
    setSamples({
      mine: [a!, b!, c!],
      dueSoon: `${d!.slice(0, 12)}7777`,
      cancelled: `${e!.slice(0, 12)}9999`,
      other: fakturNumbersFor(otherCode(account.sellerCode), 1)[0]!,
    });
  }, [account]);

  const digits = normalizeFakturNumber(number);
  const formatError =
    number && (digits.length < 13 || digits.length > 17)
      ? "A Faktur Pajak number has 13 to 17 digits"
      : null;
  const { data: pjap, isFetching } = usePjap(formatError ? undefined : digits);
  const id = computeFakturId(number);
  const { invoice } = useInvoice(id);

  const price =
    pjap?.status === "VALID"
      ? priceInvoice(
          BigInt(pjap.total!) * UNIT,
          BigInt(Math.floor(Date.parse(pjap.jatuhTempo!) / 1000)),
          BigInt(now),
          params,
        )
      : undefined;
  const notMine =
    pjap?.status === "VALID" &&
    identity.sellerNpwpHash &&
    npwpHash(pjap.penjual!.npwp) !== identity.sellerNpwpHash;

  const taken =
    invoice &&
    invoice.status !== STATUS.None &&
    invoice.status !== STATUS.Rejected &&
    invoice.status !== STATUS.FundingFailed;

  const rejected = (code: number) => ({
    failed: `Not verified: ${REJECT_REASON[code] ?? "rejected by the verifier"}.`,
    final: true,
  });

  /** Chainlink CRE writes the result on its own; wait for it to land onchain. */
  async function waitForCre() {
    const until = Date.now() + 180_000;
    while (Date.now() < until && client && id) {
      await new Promise((r) => setTimeout(r, 3000));
      const inv = (await client.readContract({
        address: addresses.registry!,
        abi: abis.registry,
        functionName: "getInvoice",
        args: [id],
      })) as { status: number; rejectCode: number };
      if (Number(inv.status) === STATUS.Funding) return;
      if (Number(inv.status) === STATUS.Rejected)
        return rejected(Number(inv.rejectCode));
    }
    return {
      outcome:
        "Still waiting for Chainlink CRE. Your invoice below updates by itself once the result is onchain.",
    };
  }

  async function verify() {
    if (CRE_MODE) return waitForCre();
    // The demo relayer runs the same check the Chainlink CRE workflow runs.
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ invoiceId: id }),
    });
    const result = res.ok
      ? ((await res.json()) as { invoiceStatus?: number; rejectCode?: number })
      : null;
    if (result?.invoiceStatus === STATUS.Funding) return;
    if (result?.invoiceStatus === STATUS.Rejected)
      return rejected(result.rejectCode ?? 0);
    return {
      outcome:
        "Submitted. The Chainlink CRE checker will write the result shortly; your invoice below updates by itself.",
    };
  }

  async function submit() {
    if (!address || !id || !price || !pjap?.total) return;
    const ok = await flow.start(
      submitPlan({
        number: digits,
        total: price.nominal,
        buyer: pjap.pembeli?.nama,
        advance: price.advance,
        holdback: price.holdback,
        cost: price.discount,
        fee: price.fee,
        tenorDays: price.tenorDays,
        cre: CRE_MODE,
        verify,
      }),
    );
    if (ok) setNumber("");
  }

  return (
    <Panel
      title="Finance a Faktur Pajak"
      tag={identity.isSeller ? "Step 2 of 2" : undefined}
    >
      <Field
        label="Faktur Pajak number"
        value={number}
        onChange={setNumber}
        placeholder="04002600012345"
        mono
        inputMode="numeric"
        error={formatError}
        helper="The number printed on your Faktur Pajak in Coretax. Dots and dashes are ignored."
      />
      {samples && (
        <div className={p.samples}>
          <p className={p.samplesNote}>
            <SimTag /> Your Faktur Pajak in Coretax (simulated). Pick one:
          </p>
          <div className={p.sampleChips}>
            {samples.mine.map((n, i) => (
              <button key={n} type="button" onClick={() => setNumber(n)}>
                <span>Invoice {String.fromCharCode(65 + i)}</span>
                <span className="mono">{n}</span>
              </button>
            ))}
            <button type="button" onClick={() => setNumber(samples.dueSoon)}>
              <span>Due in 2 minutes</span>
              <span>to see what happens on a default</span>
            </button>
            <button type="button" onClick={() => setNumber(samples.cancelled)}>
              <span>Cancelled invoice</span>
              <span>to see a rejection</span>
            </button>
            <button type="button" onClick={() => setNumber(samples.other)}>
              <span>Another business&apos;s invoice</span>
              <span>to see the NPWP check</span>
            </button>
          </div>
        </div>
      )}

      {isFetching && <Skeleton height="96px" />}
      {pjap && !isFetching && <PjapCard faktur={pjap} />}

      {notMine && (
        <Notice tone="info">
          Issued by {pjap!.penjual!.nama}, not your verified business. If you
          submit it, the check rejects it: the NPWP on the invoice doesn&apos;t
          match your Chainlink ACE credential.
        </Notice>
      )}

      {price && (
        <>
          <StatGrid>
            <Stat
              label="To your wallet when funded"
              value={formatIdrShort(price.advance)}
            />
            <Stat
              label="Held back, released when you repay"
              value={formatIdrShort(price.holdback)}
            />
            <Stat
              label={`Your total cost, ${Math.round(price.tenorDays)} days`}
              value={formatIdrShort(price.discount)}
            />
          </StatGrid>
          <Disclosure summary="How this is calculated">
            <Muted>
              Funders lend {formatIdrShort(price.target)} in total.{" "}
              {formatIdrShort(price.advance)} reaches you as soon as the vault
              is full; the other {formatIdrShort(price.holdback)} stays in the
              vault as a safety buffer and comes back to you when you repay the
              full {formatIdrShort(price.nominal)}. The cost is 1.5% per 30
              days, all-in: {formatIdrShort(price.funderGain)} to funders,{" "}
              {formatIdrShort(price.fee)} Fakturin fee.
            </Muted>
          </Disclosure>
        </>
      )}

      {taken && (
        <Notice tone="error">
          This Faktur Pajak is already registered. One number can only be
          financed once.
        </Notice>
      )}

      <div>
        <Button
          onClick={submit}
          disabled={
            !address ||
            !identity.isSeller ||
            !price ||
            Boolean(taken) ||
            flow.busy
          }
        >
          Review and submit
        </Button>
      </div>
      {!address && <Muted>Connect your wallet to submit.</Muted>}
    </Panel>
  );
}

// ------------------------------------------------------------------ list

function SellerInvoices({ seller, flow }: { seller: Addr; flow: TxFlow }) {
  const { data: ids, isLoading, error } = useSellerInvoices(seller);
  if (error) {
    return (
      <EmptyState title="Could not read events">
        The RPC refused the log scan. Set NEXT_PUBLIC_DEPLOY_BLOCK to the
        contract deploy block.
      </EmptyState>
    );
  }
  if (isLoading)
    return <EmptyState title="Reading your invoices from the chain…" />;
  if (!ids?.length) {
    return (
      <EmptyState title="No invoices yet">
        Submit a Faktur Pajak above. It shows up here with its funding progress.
      </EmptyState>
    );
  }
  return (
    <ul className={p.list}>
      {ids.map((id) => (
        <SellerInvoice key={id} id={id} flow={flow} />
      ))}
    </ul>
  );
}

function TxLink({
  hash,
  children,
}: {
  hash: `0x${string}`;
  children: React.ReactNode;
}) {
  return (
    <a href={`${EXPLORER}/tx/${hash}`} target="_blank" rel="noreferrer">
      {children} <span className="mono">{shortHex(hash, 8, 6)}</span>
    </a>
  );
}

function SellerInvoice({ id, flow }: { id: `0x${string}`; flow: TxFlow }) {
  const { invoice, hasVault } = useInvoice(id, { poll: true });
  const number = useFakturNumber(id);
  const { data: pjap } = usePjap(number);
  const { vault } = useVault(hasVault ? invoice!.vault : undefined);
  const paid =
    invoice?.status === STATUS.Financed ||
    invoice?.status === STATUS.Repaid ||
    invoice?.status === STATUS.Defaulted;
  const { data: fundedTx } = useFundedTx(
    paid && hasVault ? invoice!.vault : undefined,
  );
  const now = useNow();

  if (!invoice) {
    return (
      <li className={p.row}>
        <Skeleton width="50%" />
      </li>
    );
  }

  const repay = () =>
    vault &&
    flow.start(
      repayPlan({
        vault: invoice.vault,
        nominal: invoice.nominal,
        holdback: vault.holdback,
        advance: vault.advance,
        fee: vault.fee,
      }),
    );

  return (
    <li className={p.row}>
      <div className={p.rowTop}>
        {hasVault && <NftThumb invoiceId={id} />}
        <div className={p.rowMain}>
          <div className={p.rowHead}>
            <StatusBadge status={invoice.status} />
            <span className="mono">{number ?? "…"}</span>
            {pjap?.pembeli && (
              <span className={p.buyer}>{pjap.pembeli.nama}</span>
            )}
          </div>
          {vault && (
            <Facts
              items={[
                ["Invoice", formatIdrShort(invoice.nominal)],
                ["Paid to you", paid ? formatIdrShort(vault.advance) : "-"],
                ["Repay by", formatDate(invoice.dueDate)],
              ]}
            />
          )}
        </div>
      </div>

      {invoice.status === STATUS.Pending && (
        <Notice tone="pending">
          Chainlink is checking this invoice with the tax office.
        </Notice>
      )}
      {invoice.status === STATUS.Rejected && (
        <Notice tone="error">
          Not verified:{" "}
          {REJECT_REASON[invoice.rejectCode] ?? "rejected by the verifier"}.
        </Notice>
      )}

      {vault && invoice.status === STATUS.Funding && (
        <>
          <FundingProgress
            raised={vault.totalAssets}
            target={vault.target}
            note={<span>Closes {formatDate(vault.fundingDeadline)}</span>}
          />
          <Muted>
            {formatIdrShort(vault.advance)} arrives in your wallet automatically
            once funders fill it.
          </Muted>
        </>
      )}

      {vault && invoice.status === STATUS.Financed && (
        <>
          <Notice tone="success">
            {formatIdrShort(vault.advance)} is in your wallet.{" "}
            {fundedTx && <TxLink hash={fundedTx}>See the payment</TxLink>}
          </Notice>
          <Muted>
            When your customer pays you, repay {formatIdrShort(invoice.nominal)}
            ; {formatIdrShort(vault.holdback)} comes straight back, so{" "}
            {formatIdrShort(invoice.nominal - vault.holdback)} leaves your
            wallet.
          </Muted>
          <div className={p.actions}>
            <Button size="sm" disabled={flow.busy} onClick={repay}>
              Repay {formatIdrShort(invoice.nominal)}
            </Button>
          </div>
        </>
      )}
      {vault && invoice.status === STATUS.Repaid && (
        <Muted>
          Repaid. The {formatIdrShort(vault.holdback)} held back came back to
          you.
        </Muted>
      )}
      {invoice.status === STATUS.Defaulted && (
        <Notice tone="error">
          Not repaid in time. Funders kept the held amount and this wallet can
          no longer finance.
        </Notice>
      )}
      {invoice.status === STATUS.Funding &&
        vault &&
        now > Number(vault.fundingDeadline) && (
          <AutoClose
            kind="cancel"
            onManual={() => flow.start(closePlan(invoice.vault, "cancel"))}
            busy={flow.busy}
          />
        )}
      {invoice.status === STATUS.Financed &&
        vault &&
        now >= Number(vault.defaultableAt) && (
          <AutoClose
            kind="default"
            onManual={() => flow.start(closePlan(invoice.vault, "default"))}
            busy={flow.busy}
          />
        )}

      {vault && (
        <Disclosure summary="Details: invoice NFT and vault">
          <InvoiceNft invoiceId={id} vault={invoice.vault} who="seller" />
          <KeyValue
            items={[
              [
                "Funders lend",
                <span key="t" className="num">
                  {formatIdrShort(vault.target)}
                </span>,
              ],
              [
                "Held back",
                <span key="h" className="num">
                  {formatIdrShort(vault.holdback)}, returned when you repay
                </span>,
              ],
              [
                "Platform fee",
                <span key="f" className="num">
                  {formatIdrShort(vault.fee)}, taken from the vault on repayment
                </span>,
              ],
              ["Vault", <Address key="v" value={invoice.vault} />],
            ]}
          />
        </Disclosure>
      )}
    </li>
  );
}

// ------------------------------------------------------------------ sidebar

function SellerSidebar({
  flow,
  account,
  identity,
}: {
  flow: TxFlow;
  account?: PjapAccount;
  identity: Identity;
}) {
  const { address } = useAccount();
  const params = useRegistryParams();
  const { data: invoiceIds } = useSellerInvoices(address);
  // First visit: show the walkthrough; once the seller has invoices it folds away.
  const newcomer = !invoiceIds?.length;
  const enabled = Boolean(address);
  const { data: outstanding } = useReadContract({
    address: addresses.registry,
    abi: abis.registry,
    functionName: "sellerOutstanding",
    args: address ? [address] : undefined,
    query: { enabled },
  });
  const { data: balance } = useReadContract({
    address: addresses.idrx,
    abi: abis.idrx,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled, refetchInterval: 5000 },
  });

  return (
    <Stack>
      <Panel title="Your wallet" flush>
        <StatGrid cols={1}>
          <Stat
            label="Verified business (Chainlink ACE)"
            value={
              <span className={p.biz}>
                {identity.isSeller && account
                  ? account.nama
                  : address
                    ? "Not verified yet"
                    : "-"}
              </span>
            }
          />
          <Stat
            label="MockIDRX balance (test rupiah)"
            value={typeof balance === "bigint" ? formatIdrShort(balance) : "-"}
          />
          <Stat
            label="Borrowed now / your limit"
            value={
              typeof outstanding === "bigint" &&
              params.sellerLimit !== undefined
                ? `${formatIdrShort(outstanding)} / ${formatIdrShort(params.sellerLimit)}`
                : "-"
            }
          />
        </StatGrid>
        <div className={p.sidePad}>
          {identity.flagged && (
            <Notice tone="error">
              This wallet defaulted on an invoice and can no longer submit.
            </Notice>
          )}
          <Button
            size="sm"
            variant="plain"
            block
            disabled={!address || flow.busy}
            onClick={() =>
              address &&
              flow.start(
                faucetPlan(
                  address,
                  "You need some to repay an invoice in the demo.",
                ),
              )
            }
          >
            Get test MockIDRX
          </Button>
        </div>
      </Panel>
      <Panel title="How it works">
        <Disclosure
          summary="Step by step, with a Rp100M example"
          defaultOpen={newcomer}
        >
          <PlainSteps
            steps={[
              {
                head: "Example: you sold goods for Rp100M",
                body: "Your customer will pay in 60 days, and you issued a Faktur Pajak for the sale.",
              },
              {
                head: "Verify your business once, then submit the number",
                body: "Your business and NPWP become a Chainlink ACE credential. Chainlink then checks each invoice with the tax office and that it carries your NPWP. Your customer is never contacted.",
              },
              {
                head: "Funders lend Rp97M: Rp80M reaches you today",
                body: "It's sent the moment they fill the vault. The other Rp17M stays in the vault as a safety buffer for funders.",
              },
              {
                head: "Your customer pays you, you repay Rp100M",
                body: "The vault releases the Rp17M it held back to you. Net: you received Rp97M and paid Rp100M, a cost of Rp3M (3%).",
              },
            ]}
          />
        </Disclosure>
        <Notice tone="info">
          If you don&apos;t repay, you lose the held amount and this wallet
          can&apos;t finance again. <SimTag /> Tax data and MockIDRX are test
          data.
        </Notice>
        <Glossary />
      </Panel>
    </Stack>
  );
}
