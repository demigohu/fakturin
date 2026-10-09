"use client";

import { useRef, useState } from "react";
import { gsap, prefersReducedMotion, ScrollTrigger, setupGsap, useGSAP } from "./gsap";
import l from "./landing.module.css";

setupGsap();

const ITEMS: [string, string][] = [
  [
    "What is Fakturin?",
    "A registry and funding layer for Faktur Pajak. A seller enters the tax invoice number, Chainlink CRE checks it with the tax system through PJAP, and a dedicated ERC-4626 vault lets several funders finance it together.",
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
    "After the due date and a grace period, a Chainlink CRE keeper closes the vault as defaulted on its own. Funders share the 17% held in the vault, and the seller is flagged in the registry and cannot submit again.",
  ],
  [
    "What is simulated?",
    "PJAP tax data (real access needs a PJAP partnership), funder KYC, and MockIDR, which is a test token and not money. The CRE workflow is real; until it can run permanently, a demo relayer runs the same check.",
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
