"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowUpRight } from "@phosphor-icons/react";
import { ScrollTrigger, setupGsap, useGSAP } from "./gsap";
import { scrollToTarget } from "./Motion";
import l from "./landing.module.css";

setupGsap();

export const TABS: { id: string; label: string; tone: string }[] = [
  { id: "overview", label: "Overview", tone: "var(--accent)" },
  { id: "why", label: "Why", tone: "var(--cat-yellow)" },
  { id: "roles", label: "Roles", tone: "var(--cat-orange)" },
  { id: "split", label: "Payouts", tone: "var(--cat-lilac)" },
  { id: "demo", label: "Demo", tone: "var(--cat-green)" },
  { id: "faq", label: "FAQ", tone: "var(--cat-cyan)" },
];

/** Overflow's sticky section bar: active cell takes the section's color. */
export function BottomNav() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState("overview");

  useGSAP(() => {
    const triggers = TABS.map((t) => {
      const el = document.getElementById(t.id);
      if (!el) return null;
      return ScrollTrigger.create({
        trigger: el,
        start: "top 50%",
        end: "bottom 50%",
        onToggle: (self) => self.isActive && setActive(t.id),
      });
    });
    return () => triggers.forEach((t) => t?.kill());
  });

  return (
    <nav ref={ref} className={l.tabbar} aria-label="Page sections">
      {TABS.map((t) => (
        <a
          key={t.id}
          href={`#${t.id}`}
          className={l.tab}
          aria-current={active === t.id ? "true" : undefined}
          style={{ "--tone": t.tone } as React.CSSProperties}
          onClick={(e) => {
            e.preventDefault();
            scrollToTarget(`#${t.id}`);
          }}
        >
          {t.label}
        </a>
      ))}
      <Link href="/penjual" className={l.tabCta}>
        <span>Submit an invoice</span>
        <span className={l.tabCtaIcon}>
          <ArrowUpRight size={22} />
        </span>
      </Link>
    </nav>
  );
}
