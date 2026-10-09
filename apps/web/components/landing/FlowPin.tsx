"use client";

import Image from "next/image";
import { useRef } from "react";
import { StatusBadge } from "../ui/Status";
import { gsap, prefersReducedMotion, setupGsap, useGSAP } from "./gsap";
import l from "./landing.module.css";

setupGsap();

// The PRD section 8 demo script, one panel per step.
const STEPS: {
  who: string;
  tone: string;
  text: string;
  img: string;
  status?: number;
  reject?: string;
}[] = [
  { who: "Seller", tone: "var(--cat-lilac)", text: "Enters a Rp100M Faktur Pajak number and signs once.", img: "penjual", status: 1 },
  { who: "Chainlink CRE", tone: "var(--accent)", text: "Checks it with PJAP: real, not cancelled, never financed. A Rp97M vault opens.", img: "cek", status: 3 },
  { who: "Funder A", tone: "var(--cat-green)", text: "Picks the invoice and puts in Rp50M. The vault is half full.", img: "pemberi-dana", status: 3 },
  { who: "Funder B", tone: "var(--cat-green)", text: "Adds the last Rp47M. Rp80M reaches the seller in the same transaction.", img: "pembeli", status: 4 },
  { who: "Another seller", tone: "var(--cat-orange)", text: "Tries to submit the same Faktur Pajak. The registry refuses.", img: "hero", reject: "Already registered" },
  { who: "Seller", tone: "var(--cat-lilac)", text: "Repays Rp100M after the buyer pays. Funders withdraw about 3.09% more.", img: "mitra", status: 5 },
];

/** Pinned horizontal walkthrough (gpt-taste horizontal pan, start "top top"). */
export function FlowPin() {
  const wrap = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const mm = gsap.matchMedia();
      mm.add("(min-width: 992px)", () => {
        const distance = () => track.current!.scrollWidth - window.innerWidth;
        const tween = gsap.to(track.current, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: wrap.current,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => gsap.set(progress.current, { scaleX: self.progress }),
          },
        });
        // Each panel's image settles as it crosses the viewport center.
        gsap.utils.toArray<HTMLElement>("[data-flow-img]").forEach((img) => {
          gsap.fromTo(
            img,
            { scale: 1.15 },
            {
              scale: 1,
              ease: "none",
              scrollTrigger: {
                trigger: img,
                containerAnimation: tween,
                start: "left right",
                end: "center center",
                scrub: true,
              },
            },
          );
        });
      });
    },
    { scope: wrap },
  );

  return (
    <div ref={wrap} className={l.flowWrap}>
      <div ref={track} className={l.flowTrack}>
        <div className={l.flowIntro}>
          <h2 className={l.h2Display} data-split="words">
            The two-minute demo.
          </h2>
          <p className={l.flowLead}>
            One Rp100M Faktur Pajak, from submission to repayment, in six steps. Including the moment
            someone tries to finance the same invoice twice.
          </p>
        </div>
        {STEPS.map((s, i) => (
          <article key={i} className={l.flowPanel} style={{ "--tone": s.tone } as React.CSSProperties}>
            <header className={l.flowHead}>
              <span className={l.flowWho}>{s.who}</span>
            </header>
            <div className={l.flowMedia}>
              <Image
                src={`/illustrations/${s.img}.webp`}
                alt=""
                fill
                sizes="(max-width: 992px) 100vw, 40vw"
                className={l.flowImg}
                data-flow-img
              />
            </div>
            <div className={l.flowBody}>
              <p>{s.text}</p>
              {s.reject ? (
                <span className={l.reject} data-scramble>
                  {s.reject}
                </span>
              ) : (
                <StatusBadge status={s.status!} />
              )}
            </div>
          </article>
        ))}
      </div>
      <div className={l.flowProgress} aria-hidden>
        <span ref={progress} />
      </div>
    </div>
  );
}
