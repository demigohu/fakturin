import type { ReactNode } from "react";
import type { FlowPlan, FlowStep } from "../hooks/useTxFlow";
import { abis, addresses } from "./contracts";
import type { IdentityKind } from "./identity";
import { formatDate, formatIdrShort, formatIdrx, shortHex } from "./invoice";

/**
 * Every onchain action in the app, written for someone who has never used a wallet:
 * what happens, why each signature is needed, and exactly what it authorizes.
 */

type Hex = `0x${string}`;

/** "Rp5,000,000 MockIDRX" plus the raw 2-decimal integer the contract actually receives. */
function amountArg(amount: bigint): ReactNode {
  return (
    <>
      {formatIdrx(amount)} MockIDRX <span className="mono">({amount.toString()} raw units, 2 decimals)</span>
    </>
  );
}

function addr(label: string, value: Hex): ReactNode {
  return (
    <>
      {label} <span className="mono">{shortHex(value)}</span>
    </>
  );
}

// ------------------------------------------------------------------ steps

function approveStep(spender: Hex, spenderLabel: string, amount: bigint, purpose: string): FlowStep {
  return {
    kind: "tx",
    title: `Allow the ${spenderLabel} to take exactly ${formatIdrx(amount)}`,
    why: (
      <>
        MockIDRX is a token in your wallet. No app can move it without your permission, so you first approve this
        exact amount, for this {spenderLabel} only. {purpose}
      </>
    ),
    call: {
      contract: "MockIDRX (token)",
      address: addresses.idrx!,
      fn: "approve",
      args: [
        ["spender", addr(`The ${spenderLabel}`, spender)],
        ["amount", amountArg(amount)],
      ],
    },
    params: { address: addresses.idrx!, abi: abis.idrx, functionName: "approve", args: [spender, amount] },
  };
}

function faucetStep(to: Hex): FlowStep {
  return {
    kind: "tx",
    title: "Receive Rp1,000,000,000 in test MockIDRX",
    why: "The test token contract creates new MockIDRX and sends it to your wallet. It has no real value.",
    call: {
      contract: "MockIDRX (token)",
      address: addresses.idrx!,
      fn: "faucet",
      args: [["to", addr("Your wallet", to)]],
    },
    params: { address: addresses.idrx!, abi: abis.idrx, functionName: "faucet", args: [to] },
  };
}

// ------------------------------------------------------------------ plans

export function faucetPlan(to: Hex, reason: string): FlowPlan {
  return {
    title: "Get test money",
    summary: (
      <p>
        This demo uses <strong>MockIDRX</strong>, a test copy of the IDRX rupiah stablecoin (1 token = Rp1). It has no
        real value and is not issued by IDRX. {reason}
      </p>
    ),
    steps: [faucetStep(to)],
    done: "Rp1,000,000,000 test MockIDRX is in your wallet.",
  };
}

export function submitPlan(opts: {
  number: string;
  total: bigint;
  buyer?: string;
  advance: bigint;
  holdback: bigint;
  cost: bigint;
  fee: bigint;
  tenorDays: number;
  /** Chainlink CRE (not the demo relayer) runs step 2. */
  cre?: boolean;
  verify: () => Promise<{ failed?: string; final?: boolean; outcome?: ReactNode } | void>;
}): FlowPlan {
  return {
    title: "Ask to finance this invoice",
    summary: (
      <>
        <p>
          You are asking funders to pay you early for Faktur Pajak <span className="mono">{opts.number}</span>
          {opts.buyer ? <> ({opts.buyer})</> : null}, worth <strong>{formatIdrx(opts.total)}</strong>.
        </p>
        <p>
          If it checks out, a funding pool (&ldquo;vault&rdquo;) opens. Funders lend{" "}
          {formatIdrShort(opts.advance + opts.holdback)} in total: <strong>{formatIdrx(opts.advance)}</strong> is sent to
          your wallet the moment the vault is full, and the other {formatIdrShort(opts.holdback)} is held back as a safety
          buffer and released to you when you repay {formatIdrShort(opts.total)}.
        </p>
        <p>
          Total cost for {Math.round(opts.tenorDays)} days: <strong>{formatIdrx(opts.cost)}</strong> (1.5% per 30 days,
          all-in). Of that, {formatIdrShort(opts.cost - opts.fee)} goes to the funders and {formatIdrShort(opts.fee)} is the
          Fakturin fee.
        </p>
        <p>
          Why you sign first: step 1 writes your request on the blockchain. Chainlink watches for that record and only then
          checks the tax office (step 2).
        </p>
      </>
    ),
    steps: [
      {
        kind: "tx",
        title: "Register the invoice number on the blockchain",
        why: "Records that your wallet is asking to finance this Faktur Pajak. From now on nobody else can finance the same number. No money moves.",
        call: {
          contract: "FakturRegistry",
          address: addresses.registry!,
          fn: "requestVerification",
          args: [["fakturNumber", <span key="n" className="mono">&quot;{opts.number}&quot;</span>]],
        },
        params: {
          address: addresses.registry!,
          abi: abis.registry,
          functionName: "requestVerification",
          args: [opts.number],
        },
      },
      {
        kind: "offchain",
        title: opts.cre
          ? "Chainlink CRE sees your request and checks the tax office (10–60 seconds)"
          : "Chainlink sees your request and checks the tax office",
        why: "Triggered by the record from step 1, an automated checker asks the tax system (PJAP, simulated here) whether the invoice is real and not cancelled. The contract then checks that the seller NPWP on the invoice matches the business your wallet verified (your Chainlink ACE credential), opens the vault and mints the invoice NFT into it. You don't sign anything.",
        run: opts.verify,
      },
    ],
    done: "Verified. Your funding vault is open and funders can see it in the Market.",
  };
}

export function repayPlan(opts: { vault: Hex; nominal: bigint; holdback: bigint; advance: bigint; fee: bigint }): FlowPlan {
  const cost = opts.nominal - opts.advance - opts.holdback;
  return {
    title: `Repay ${formatIdrx(opts.nominal)}`,
    summary: (
      <>
        <p>
          Your customer paid you outside this app. Now repay the full <strong>{formatIdrx(opts.nominal)}</strong> into
          the vault.
        </p>
        <p>
          Where the {formatIdrShort(opts.holdback)} you get back comes from: funders lent{" "}
          {formatIdrShort(opts.advance + opts.holdback)} for this invoice. You received {formatIdrShort(opts.advance)} when
          the vault filled; the other {formatIdrShort(opts.holdback)} stayed in the vault as a safety buffer for funders.
          Now that you repay, the vault releases it to you in the same transaction.
        </p>
        <table className="moneyflow">
          <tbody>
            <tr>
              <td>You pay into the vault</td>
              <td className="num">−{formatIdrx(opts.nominal)}</td>
            </tr>
            <tr>
              <td>Vault releases the held-back part to you</td>
              <td className="num">+{formatIdrx(opts.holdback)}</td>
            </tr>
            <tr>
              <td>Out of your pocket now</td>
              <td className="num">{formatIdrx(opts.nominal - opts.holdback)}</td>
            </tr>
            <tr>
              <td>Fakturin fee (part of your cost, sent to the platform)</td>
              <td className="num">{formatIdrx(opts.fee)}</td>
            </tr>
            <tr>
              <td>Left in the vault for funders to withdraw</td>
              <td className="num">{formatIdrx(opts.nominal - opts.fee)}</td>
            </tr>
          </tbody>
        </table>
        <p>
          Overall you received {formatIdrShort(opts.advance + opts.holdback)} and paid back {formatIdrShort(opts.nominal)}:
          a cost of {formatIdrShort(cost)}.
        </p>
      </>
    ),
    steps: [
      approveStep(opts.vault, "vault", opts.nominal, "The vault takes it in the next step and pays the funders."),
      {
        kind: "tx",
        title: `Pay ${formatIdrx(opts.nominal)} into the vault`,
        why: `The vault takes the amount you just approved, releases the ${formatIdrShort(opts.holdback)} it held back to you, sends the ${formatIdrShort(opts.fee)} platform fee to Fakturin, closes the invoice as repaid and burns the invoice NFT. Funders can then withdraw.`,
        call: { contract: "FakturVault", address: opts.vault, fn: "repay", args: [] },
        params: { address: opts.vault, abi: abis.vault, functionName: "repay", args: [] },
      },
    ],
    done: `Repaid. The held-back ${formatIdrShort(opts.holdback)} is in your wallet and the funders can withdraw.`,
  };
}

/**
 * Identity check for a funder (KYC) or a seller's business (KYB), issued as Chainlink ACE
 * credentials. Step 1 is a free signature proving wallet control; step 2 is the (simulated)
 * verification provider writing the credential onchain.
 */
export function identityPlan(opts: {
  kind: IdentityKind;
  sign: () => Promise<{ issuedAt: string; signature: Hex }>;
  issue: (proof: { issuedAt: string; signature: Hex }) => Promise<{ failed?: string; outcome?: ReactNode } | void>;
  business?: { nama: string; npwpMasked: string };
}): FlowPlan {
  let proof: { issuedAt: string; signature: Hex } | undefined;
  const kyb = opts.kind === "kyb";
  return {
    title: kyb ? "Verify your business" : "Verify your identity",
    summary: kyb ? (
      <>
        <p>
          Before you can finance invoices, a verification provider confirms your business and links it to this wallet. Here
          that means your tax account{opts.business ? <> ({opts.business.nama}, NPWP {opts.business.npwpMasked})</> : null}{" "}
          is checked as an active PKP. The tax-office link and the provider are <strong>simulated</strong>.
        </p>
        <p>
          The result is stored as a <strong>Chainlink ACE</strong> credential: only a hash of your NPWP goes onchain, never
          the number itself. Later, every invoice you submit must carry this same NPWP, so nobody can finance an invoice that
          isn&apos;t theirs.
        </p>
      </>
    ) : (
      <>
        <p>
          Lending platforms must know who their lenders are (KYC). A verification provider checks you and records the result
          as a <strong>Chainlink ACE</strong> credential on this wallet. Vaults only accept money from wallets holding it. The
          provider is <strong>simulated</strong> in this demo.
        </p>
        <p>No personal data goes onchain, only the fact that this wallet passed the check.</p>
      </>
    ),
    steps: [
      {
        kind: "offchain",
        signature: true,
        title: "Sign a message proving this wallet is yours",
        why: "Your wallet shows a short text to sign. It costs nothing and sends no transaction.",
        run: async () => {
          proof = await opts.sign();
        },
      },
      {
        kind: "offchain",
        title: kyb ? "The provider verifies your business and issues the credential" : "The provider verifies you and issues the credential",
        why: kyb
          ? "It writes a Cross-Chain ID for your wallet and two credentials to Chainlink ACE: common.kyb (business verified) and id.fakturin.pkp (VAT-registered, with your NPWP hash). Only the authorized provider can write them."
          : "It writes a Cross-Chain ID for your wallet and the common.kyc credential to Chainlink ACE. Only the authorized provider can write it.",
        run: () => (proof ? opts.issue(proof) : Promise.resolve({ failed: "Sign the message first." })),
      },
    ],
    done: kyb ? "Your business is verified. You can now finance your invoices." : "You're verified. You can now lend to invoices.",
  };
}

export function fundPlan(opts: {
  vault: Hex;
  owner: Hex;
  amount: bigint;
  nominal: bigint;
  target: bigint;
  holdback: bigint;
  advance: bigint;
  remaining: bigint;
  fee: bigint;
  dueDate: bigint;
  buyer?: string;
  number?: string;
}): FlowPlan {
  const back = (opts.amount * (opts.nominal - opts.fee)) / opts.target;
  const sellerCost = opts.nominal - opts.target;
  const fills = opts.amount >= opts.remaining;
  return {
    title: `Lend ${formatIdrx(opts.amount)}`,
    summary: (
      <>
        <p>
          You lend <strong>{formatIdrx(opts.amount)}</strong> against Faktur Pajak{" "}
          <span className="mono">{opts.number ?? ""}</span>
          {opts.buyer ? <> (billed to {opts.buyer})</> : null}. When the seller repays by{" "}
          {formatDate(opts.dueDate)}, you get back <strong>{formatIdrx(back)}</strong>.
        </p>
        <p>
          Where your return comes from: the seller borrows {formatIdrShort(opts.target)} and repays{" "}
          {formatIdrShort(opts.nominal)}. Of that {formatIdrShort(sellerCost)} difference,{" "}
          {formatIdrShort(sellerCost - opts.fee)} goes to the funders (split by how much each lent) and{" "}
          {formatIdrShort(opts.fee)} is the Fakturin fee.
        </p>
        <p>
          {fills
            ? `Your deposit fills the vault, so ${formatIdrShort(opts.advance)} is paid to the seller in this same transaction.`
            : `The seller is paid once the vault is full. If it isn't full by the deadline, your money comes back in full.`}{" "}
          Risk: if the seller never repays, you only get your share of the {formatIdrShort(opts.holdback)} held in the
          vault.
        </p>
      </>
    ),
    steps: [
      approveStep(opts.vault, "vault", opts.amount, "The vault takes it in the next step."),
      {
        kind: "tx",
        title: `Put ${formatIdrx(opts.amount)} into the vault`,
        why: "The vault takes the amount you approved and gives you vault shares: a receipt for your part of this invoice. You use them later to withdraw.",
        call: {
          contract: "FakturVault (ERC-4626)",
          address: opts.vault,
          fn: "deposit",
          args: [
            ["assets", amountArg(opts.amount)],
            ["receiver", addr("Your wallet (gets the shares)", opts.owner)],
          ],
        },
        params: { address: opts.vault, abi: abis.vault, functionName: "deposit", args: [opts.amount, opts.owner] },
      },
    ],
    done: fills
      ? `Done. The vault is full and the seller has been paid. Your loan is listed under My loans.`
      : `Done. Your ${formatIdrShort(opts.amount)} is in the vault. Track it under My loans.`,
  };
}

export function withdrawPlan(opts: { vault: Hex; owner: Hex; shares: bigint; value: bigint; why: string }): FlowPlan {
  return {
    title: `Withdraw ${formatIdrx(opts.value)}`,
    summary: <p>{opts.why}</p>,
    steps: [
      {
        kind: "tx",
        title: `Hand back your shares and receive ${formatIdrx(opts.value)}`,
        why: "The vault burns your shares and sends your part of the money to your wallet.",
        call: {
          contract: "FakturVault (ERC-4626)",
          address: opts.vault,
          fn: "redeem",
          args: [
            ["shares", <span key="s" className="mono">{opts.shares.toString()}</span>],
            ["receiver", addr("Your wallet", opts.owner)],
            ["owner", addr("Your wallet", opts.owner)],
          ],
        },
        params: {
          address: opts.vault,
          abi: abis.vault,
          functionName: "redeem",
          args: [opts.shares, opts.owner, opts.owner],
        },
      },
    ],
    done: `${formatIdrShort(opts.value)} is in your wallet.`,
  };
}

export function closePlan(vault: Hex, kind: "default" | "cancel"): FlowPlan {
  const isDefault = kind === "default";
  return {
    title: isDefault ? "Close as defaulted" : "Close and refund",
    summary: (
      <p>
        {isDefault
          ? "The seller did not repay by the due date plus the grace period. Normally this closes automatically; you can also close it now. The money held in the vault becomes withdrawable by funders."
          : "The vault was not filled before its deadline. Normally this closes automatically; you can also close it now. Every funder can then withdraw their deposit 1:1."}
      </p>
    ),
    steps: [
      {
        kind: "tx",
        title: isDefault ? "Mark the invoice as defaulted" : "Cancel the funding",
        why: "Anyone may do this once the deadline has passed; the contract checks the time itself.",
        call: { contract: "FakturVault", address: vault, fn: isDefault ? "markDefault" : "cancelFunding", args: [] },
        params: { address: vault, abi: abis.vault, functionName: isDefault ? "markDefault" : "cancelFunding", args: [] },
      },
    ],
    done: isDefault ? "Closed. Funders can withdraw the held amount." : "Closed. Funders can withdraw their deposits.",
  };
}
