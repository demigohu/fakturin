"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowDown, ArrowUpRight } from "@phosphor-icons/react";
import { gsap, prefersReducedMotion, ScrollTrigger, setupGsap, useGSAP } from "./gsap";
import { scrollToTarget, whenIntroReveal } from "./Motion";
import l from "./landing.module.css";

setupGsap();

/** The three chapters; each one drives a stage of the pinned illustration. */
const CHAPTERS = [
  {
    who: "Seller",
    tone: "var(--cat-lilac)",
    title: "Verify once, pick a Faktur Pajak.",
    body: "Your business is verified once and stored as a Chainlink ACE credential. Then pick an invoice from Coretax and sign. No documents, and your customer never has to use the app.",
  },
  {
    who: "Chainlink CRE",
    tone: "var(--accent)",
    title: "Checked with the tax system.",
    body: "A Chainlink CRE workflow asks PJAP whether the invoice is real and not cancelled. The contract checks it carries your NPWP and was never financed, then opens a funding vault.",
  },
  {
    who: "Funders",
    tone: "var(--cat-green)",
    title: "Funded by many, once.",
    body: "Verified funders pick the invoice and each put in what they want. When the vault is full, 80% reaches the seller in the same transaction.",
  },
];

const STATUS = [
  { label: "Verifying", tone: "var(--cat-lilac)" },
  { label: "Funding", tone: "var(--accent)" },
  { label: "Financed", tone: "var(--cat-green)" },
];

type Piece = { src: string; box: [number, number, number]; rotate: number; wiggle: number; z: number };

const DECOR: Piece[] = [
  { src: "formulir", box: [0, 6, 26], rotate: -6, wiggle: 6, z: 1 },
  { src: "penjepit", box: [74, 0, 22], rotate: 12, wiggle: 7, z: 1 },
  { src: "bantalan", box: [56, 76, 26], rotate: 0, wiggle: 4, z: 1 },
];

export function HeroStory() {
  const ref = useRef<HTMLElement>(null);
  const [stage, setStage] = useState(0);
  const stageRef = useRef(0);

  const { contextSafe } = useGSAP(
    () => {
      const q = gsap.utils.selector(ref);
      const reduced = prefersReducedMotion();

      // Chapter focus drives the stage (both directions). On mobile the art covers the
      // top of the screen, so the reading zone sits lower.
      const mobile = window.matchMedia("(max-width: 991px)").matches;
      q("[data-chapter]").forEach((el, i) => {
        ScrollTrigger.create({
          trigger: el,
          start: mobile ? "top 82%" : "top 62%",
          end: mobile ? "bottom 62%" : "bottom 38%",
          onToggle: (self) => {
            if (self.isActive) go(i);
          },
        });
      });

      if (reduced) return;

      gsap.set(q("[data-piece]"), { autoAlpha: 0, yPercent: -30 });
      const off = whenIntroReveal(() => {
        gsap.to(q("[data-piece]"), {
          autoAlpha: 1,
          yPercent: 0,
          duration: 1,
          delay: 0.45,
          ease: "back.out(1.5)",
          stagger: { each: 0.07, from: "random" },
        });
      });
      return off;
    },
    { scope: ref },
  );

  /** Plays the transition into stage `next`, from whatever stage is showing. */
  const go = contextSafe((next: number) => {
    const prev = stageRef.current;
    if (next === prev) return;
    stageRef.current = next;
    setStage(next);
    if (prefersReducedMotion()) return;
    const q = gsap.utils.selector(ref);
    const tl = gsap.timeline();

    if (next >= 1 && prev < 1) {
      // Stamp comes down onto the invoice, squashes, leaves its mark.
      tl.to(q("[data-stamp]"), { xPercent: -46, yPercent: 62, duration: 0.45, ease: "power3.in" })
        .to(q("[data-stamp-body]"), { scaleY: 0.84, scaleX: 1.05, transformOrigin: "50% 100%", duration: 0.12 })
        .fromTo(q("[data-ink]"), { scale: 1.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.3, ease: "back.out(2)" }, "<")
        .to(q("[data-faktur]"), { y: 6, duration: 0.08, yoyo: true, repeat: 1 }, "<")
        .to(q("[data-stamp-body]"), { scaleY: 1, scaleX: 1, duration: 0.35, ease: "elastic.out(1, 0.4)" })
        .to(q("[data-stamp]"), { xPercent: 0, yPercent: 0, duration: 0.6, ease: "back.out(1.3)" }, "<");
    }
    if (next < 1 && prev >= 1) {
      tl.to(q("[data-ink]"), { autoAlpha: 0, scale: 0.9, duration: 0.3 });
    }
    if (next >= 2 && prev < 2) {
      tl.to(q("[data-token]"), { xPercent: 70, yPercent: -95, rotate: -4, scale: 0.9, duration: 0.7, ease: "back.inOut(1.2)" })
        .fromTo(q("[data-payout]"), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.4 }, "-=0.15");
    }
    if (next < 2 && prev >= 2) {
      tl.to(q("[data-payout]"), { autoAlpha: 0, y: 10, duration: 0.25 })
        .to(q("[data-token]"), { xPercent: 0, yPercent: 0, rotate: 0, scale: 1, duration: 0.6 }, "<");
    }
    if (next === 0) {
      // The pen signs the invoice.
      tl.fromTo(
        q("[data-pen]"),
        { xPercent: 0, yPercent: 0 },
        { xPercent: -26, yPercent: -16, duration: 0.35, yoyo: true, repeat: 1, ease: "power2.inOut" },
      );
    }
    tl.fromTo(q("[data-status]"), { scale: 0.9 }, { scale: 1, duration: 0.4, ease: "back.out(3)" }, 0);
  });

  const status = STATUS[stage]!;

  return (
    <section ref={ref} id="overview" className={l.hero} data-theme-section="light">
      <div className={l.heroText}>
        <div className={l.heroFirst}>
          <h1 className={l.h1} data-split="words" data-split-trigger="intro" data-stagger="0.07">
            Get paid today, not in 60 days.
          </h1>
          <p className={l.heroSub}>
            Invoice financing for Indonesian small businesses: borrow against a Faktur Pajak that
            Chainlink checks with the tax office. Verified funders lend and earn about 16% a year.
          </p>
          <dl className={l.heroMeta}>
            <div>
              <dt>Network</dt>
              <dd>Arbitrum Sepolia</dd>
            </div>
            <div>
              <dt>Built for</dt>
              <dd>ETH Jakarta 2026, RWA track</dd>
            </div>
          </dl>
          <div className={l.heroCtas}>
            <Link href="/borrow" className={l.cta} data-magnetic="24">
              <span className={l.ctaLabel}>Borrow against an invoice</span>
              <span className={l.ctaIcon}>
                <ArrowUpRight size={22} aria-hidden />
              </span>
            </Link>
            <a
              href="#how-it-works"
              className={l.textLink}
              onClick={(e) => {
                e.preventDefault();
                scrollToTarget("#how-it-works");
              }}
            >
              See how it works <ArrowDown size={16} aria-hidden />
            </a>
          </div>
        </div>

        <ol id="how-it-works" className={l.chapters}>
          {CHAPTERS.map((c, i) => (
            <li
              key={c.who}
              className={l.chapter}
              data-chapter
              data-active={stage === i}
              style={{ "--tone": c.tone } as React.CSSProperties}
            >
              <span className={l.chapterWho}>{c.who}</span>
              <h2 className={l.chapterTitle}>{c.title}</h2>
              <p className={l.chapterBody}>{c.body}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className={`${l.heroStage} graph-paper`}>
        <div className={l.heroSticky}>
          <div className={l.heroArt} aria-hidden>
            {DECOR.map((p) => (
              <div
                key={p.src}
                className={l.piece}
                data-piece
                style={{ left: `${p.box[0]}%`, top: `${p.box[1]}%`, width: `${p.box[2]}%`, zIndex: p.z, rotate: `${p.rotate}deg` }}
              >
                <div data-wiggle={p.wiggle}>
                  <Image src={`/illustrations/${p.src}.webp`} alt="" width={640} height={640} className={l.pieceImg} />
                </div>
              </div>
            ))}

            <div className={l.piece} data-piece data-faktur style={{ left: "16%", top: "22%", width: "60%", zIndex: 2 }}>
              <Image src="/illustrations/faktur.webp" alt="" width={640} height={640} priority className={l.pieceImg} />
              <span className={l.inkMark} data-ink>
                Verified
              </span>
            </div>

            <div className={l.piece} data-piece style={{ left: "4%", top: "60%", width: "30%", zIndex: 3 }}>
              <div data-token>
                <div data-wiggle="5">
                  <Image src="/illustrations/token.webp" alt="" width={640} height={640} className={l.pieceImg} />
                </div>
              </div>
            </div>

            <div className={l.piece} data-piece style={{ left: "68%", top: "44%", width: "32%", zIndex: 3, rotate: "6deg" }}>
              <div data-pen>
                <Image src="/illustrations/pulpen.webp" alt="" width={640} height={640} className={l.pieceImg} />
              </div>
            </div>

            <div className={l.piece} data-piece data-stamp style={{ left: "50%", top: "2%", width: "28%", zIndex: 4 }}>
              <span data-stamp-body className={l.stampBody}>
                <Image src="/illustrations/stempel.webp" alt="" width={640} height={640} className={l.pieceImg} />
              </span>
            </div>

            <span className={l.payout} data-payout>
              Rp80,000,000 paid to seller
            </span>
          </div>

          <div className={l.sceneBar} role="status" aria-live="polite">
            <span className={l.sceneLabel}>Invoice status</span>
            <span className={l.sceneStatus} data-status style={{ background: status.tone }}>
              {status.label}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
