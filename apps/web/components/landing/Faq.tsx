"use client";

import { useRef, useState } from "react";
import { gsap, prefersReducedMotion, ScrollTrigger, setupGsap, useGSAP } from "./gsap";
import l from "./landing.module.css";

setupGsap();

const ITEMS: [string, string][] = [
  [
    "What is Fakturin?",
    "Invoice financing on Arbitrum. A verified business picks a Faktur Pajak, Chainlink CRE checks it with the tax system through PJAP, and a dedicated ERC-4626 vault lets several verified funders finance it together. The business gets 80% at once and repays when its customer pays; overdue vaults close on their own.",
  ],
  [
    "Who can use it?",
    "Verified wallets only. Sellers pass KYB once and receive Chainlink ACE credentials (business verified, plus VAT-registered with a hash of their NPWP); funders pass KYC. Credentials live in Chainlink ACE's IdentityRegistry and CredentialRegistry, and only the authorized verification provider can write them. No personal data goes onchain.",
  ],
  [
    "What does it cost, and who earns what?",
    "The seller pays 1.5% per 30 days of tenor, all-in (within OJK's 0.067% per day cap for productive financing). 90% of that goes to funders, split by how much each lent; 10% is the Fakturin fee, taken only when the invoice is repaid.",
  ],
  [
    "Does the buyer have to do anything?",
    "No. Fakturin uses silent factoring: the buyer pays the seller as usual and the seller repays the vault. The buyer never needs a wallet or an account.",
  ],
  [
    "How is double financing prevented?",
    "The invoice ID is the hash of the national Faktur Pajak number. While it is verifying, funding or financed, nobody can submit it again, and once financed it is refused forever.",
  ],
  [
    "Why a vault per invoice instead of a pool?",
    "Indonesian rules (POJK 40/2024) forbid automatic allocation of funders' money. Each vault holds one invoice and every funder chooses it themselves.",
  ],
  [
    "What happens if the seller does not repay?",
    "After the due date and a grace period, a Chainlink CRE keeper closes the vault as defaulted on its own. Funders share the part held back in the vault (about 17% on a 60-day invoice), and the seller is flagged in the registry and cannot finance again.",
  ],
  [
    "What is simulated?",
    "PJAP tax data (real access needs a PJAP partnership), the KYC/KYB verification provider (the Chainlink ACE contracts are real, the provider writing the credentials is a demo), and MockIDRX, a test copy of IDRX (the rupiah stablecoin, 2 decimals) that is not money and not issued by IDRX. In production the vaults would hold IDRX or another rupiah stablecoin once it is on Arbitrum. The CRE workflows are real; until they can run permanently, a demo relayer runs the same checks.",
  ],
];

export function Faq() {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const { contextSafe } = useGSAP({ scope: ref });

  const toggle = contextSafe((i: number) => {
    const panels = ref.current!.querySelectorAll<HTMLElement>("[data-answer]");
    const reduce = prefersReducedMotion();
    panels.forEach((p, j) => {
      const show = j === i && open !== i;
      gsap.to(p, {
        height: show ? "auto" : 0,
        duration: reduce ? 0 : show ? 0.525 : 0.65,
        onComplete: () => ScrollTrigger.refresh(),
      });
    });
    setOpen(open === i ? null : i);
  });

  return (
    <div ref={ref} className={l.faq}>
      {ITEMS.map(([qText, a], i) => (
        <div key={qText} className={l.faqItem} data-state={open === i ? "open" : "closed"}>
          <button
            type="button"
            id={`faq-q-${i}`}
            className={l.faqButton}
            aria-expanded={open === i}
            aria-controls={`faq-${i}`}
            onClick={() => toggle(i)}
          >
            <span className={l.faqQ}>{qText}</span>
            <span className={l.faqToggle} aria-hidden>
              <span className={l.faqDots}>
                {Array.from({ length: 9 }, (_, k) => (
                  <i key={k} />
                ))}
              </span>
            </span>
          </button>
          <div id={`faq-${i}`} className={l.faqAnswer} data-answer role="region" aria-labelledby={`faq-q-${i}`}>
            <p>{a}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
