"use client";

import { useRef, useState } from "react";
import { addresses } from "../../lib/contracts";
import { EXPLORER } from "../../lib/invoice";
import { Flip, prefersReducedMotion, setupGsap, useGSAP } from "./gsap";
import l from "./landing.module.css";

setupGsap();

const ITEMS: { name: string; addr?: string; role: string; big?: boolean }[] = [
  { name: "FakturRegistry", addr: addresses.registry, role: "Faktur Pajak IDs, verification, limits, defaults", big: true },
  { name: "FakturVaultFactory", addr: addresses.factory, role: "One ERC-4626 vault per verified invoice", big: true },
  { name: "FakturNFT", addr: addresses.nft, role: "Invoice token, locked inside its vault" },
  { name: "MockIDR", addr: addresses.mockIdr, role: "Test token, not real rupiah" },
  { name: "FakturVerifierReceiver", addr: addresses.receiver, role: "Chainlink CRE verification consumer" },
  { name: "FakturKeeper", addr: addresses.keeper, role: "Chainlink CRE cron closes overdue vaults" },
];

const COLORS = ["#4da2ff", "#ffd731", "#e9ccff", "#55db9c"];

/**
 * Deployed contracts; a colored block Flips into the hovered cell (overflow sponsor grid).
 * React owns which cell holds the block, so re-renders never snap it back.
 */
export function ContractGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState({ index: 0, color: COLORS[0]! });
  const flipState = useRef<Flip.FlipState | null>(null);

  // After React moves the block, animate it from where it was.
  useGSAP(
    () => {
      const state = flipState.current;
      if (!state) return;
      flipState.current = null;
      Flip.from(state, { targets: "[data-flip-id=contract-bg]", duration: 0.425, ease: "power3" });
    },
    { scope: ref, dependencies: [active.index] },
  );

  function enter(index: number) {
    if (index === active.index) return;
    if (!prefersReducedMotion()) {
      flipState.current = Flip.getState(ref.current!.querySelector("[data-flip-id=contract-bg]"), {
        props: "backgroundColor",
      });
    }
    let color = active.color;
    while (color === active.color) color = COLORS[Math.floor(Math.random() * COLORS.length)]!;
    setActive({ index, color });
  }

  return (
    <div ref={ref} className={l.contracts} data-reveal-row>
      {ITEMS.map((it, i) => (
        <a
          key={it.name}
          href={it.addr ? `${EXPLORER}/address/${it.addr}` : undefined}
          target="_blank"
          rel="noreferrer"
          className={`${l.contract} ${it.big ? l.contractBig : ""}`}
          onPointerEnter={() => enter(i)}
          onFocus={() => enter(i)}
          data-reveal-item
        >
          {active.index === i && (
            <span
              className={l.flipBg}
              data-flip-id="contract-bg"
              style={{ backgroundColor: active.color }}
              aria-hidden
            />
          )}
          <span className={l.contractLabel}>
            {it.name} [&#8599;]
          </span>
          <span className={l.contractAddr}>{it.addr ?? "Not deployed"}</span>
          <span className={l.contractRole}>{it.role}</span>
        </a>
      ))}
    </div>
  );
}
