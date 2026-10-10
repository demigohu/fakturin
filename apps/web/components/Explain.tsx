import type { ReactNode } from "react";
import s from "./explain.module.css";

/** Numbered story in plain words, with an example amount per step. */
export function PlainSteps({ steps }: { steps: { head: ReactNode; body: ReactNode }[] }) {
  return (
    <ol className={s.steps}>
      {steps.map((st, i) => (
        <li key={i}>
          <span className={s.num} aria-hidden>
            {i + 1}
          </span>
          <div>
            <p className={s.head}>{st.head}</p>
            <p className={s.body}>{st.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

const TERMS: [string, string][] = [
  ["Faktur Pajak", "The official tax invoice a VAT-registered business (PKP) issues to its customer in Coretax. Each has a unique number."],
  ["Invoice financing", "Getting paid now for an invoice your customer will pay later. Funders lend the money; you repay when your customer pays."],
  ["Vault", "A pool of money for one invoice, run by a smart contract. Funders put money in, the seller is paid from it, and repayments go back into it."],
  ["MockIDRX", "A test copy of IDRX, a rupiah stablecoin (1 token = Rp1, 2 decimals). It has no value and is not issued by IDRX; get it free with \"Get test MockIDRX\"."],
  ["Approve", "Giving a contract permission to take an exact amount of a token from your wallet. Nothing moves until the next step."],
  ["Network fee (gas)", "A small fee the blockchain charges for every confirmed action, paid in test ETH on Arbitrum Sepolia."],
  ["Shares", "Your receipt from a vault. They record your part of the invoice and are swapped back for money when you withdraw."],
  ["Default", "The seller did not repay after the due date and a grace period. Funders then share the money held in the vault."],
];

/** Collapsible glossary for first-time users. */
export function Glossary() {
  return (
    <details className={s.glossary}>
      <summary>Words used on this page</summary>
      <dl>
        {TERMS.map(([term, meaning]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{meaning}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
