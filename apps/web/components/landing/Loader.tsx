"use client";

import { useRef, useState } from "react";
import { gsap, setupGsap, useGSAP } from "./gsap";
import { INTRO_DONE, INTRO_REVEAL } from "./Motion";
import l from "./landing.module.css";

setupGsap();

const BLOCKS = 16;

/** Inline script for <head>-time decision: play the intro once per session. */
export const INTRO_SCRIPT = `try{var d=document.documentElement;if(!sessionStorage.getItem('fakturin.intro')&&!matchMedia('(prefers-reduced-motion: reduce)').matches){d.dataset.intro='play';sessionStorage.setItem('fakturin.intro','1')}}catch(e){}`;

/** Polygon with an even-odd hole; the hole grows to reveal the page underneath. */
function hole(w: number, h: number, hw: number, hh: number) {
  const l0 = (w - hw) / 2;
  const t0 = (h - hh) / 2;
  const r0 = l0 + hw;
  const b0 = t0 + hh;
  return `polygon(evenodd, 0px 0px, ${w}px 0px, ${w}px ${h}px, 0px ${h}px, 0px 0px, ${l0}px ${t0}px, ${r0}px ${t0}px, ${r0}px ${b0}px, ${l0}px ${b0}px, ${l0}px ${t0}px)`;
}

/** Overflow-style loader (DESIGN.md section 4): progress window that expands into the page. */
export function Loader() {
  const ref = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);

  useGSAP(
    () => {
      const root = document.documentElement;
      if (root.dataset.intro !== "play" || !ref.current) {
        setGone(true);
        return;
      }
      const el = ref.current;
      const q = gsap.utils.selector(el);
      const pct = q("[data-pct]")[0] as HTMLElement;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const win = q("[data-window]")[0] as HTMLElement;
      const bar = q("[data-bar]")[0] as HTMLElement;
      // Same sizes as the CSS first paint (--lw / --lh in landing.module.css).
      const lw = Math.min(720, w * 0.9);
      const lh = Math.min(560, h * 0.8);
      const box = { top: (h - lh) / 2, left: (w - lw) / 2 };

      gsap.set(el, { clipPath: hole(w, h, 0, 0) });
      gsap.set(win, { clipPath: `inset(${box.top}px ${box.left}px ${box.top}px ${box.left}px)` });

      const progress = { v: 0 };
      const tl = gsap.timeline({
        onComplete: () => {
          root.dataset.intro = "done";
          window.dispatchEvent(new Event(INTRO_DONE));
          setGone(true);
        },
      });

      tl.to(q("[data-block]"), { opacity: 1, stagger: 0.1 })
        .to(
          progress,
          {
            v: 100,
            duration: 2,
            ease: "none",
            onUpdate: () => {
              pct.textContent = `${Math.round(progress.v)}%`;
            },
          },
          0,
        )
        .to(q("[data-status]"), { scrambleText: { text: "REGISTRY READY", chars: "upperCase" }, duration: 0.6 }, 1.3)
        .to(q("[data-block]"), { opacity: 0, stagger: 0.01 })
        .to(q("[data-blocks]"), { clipPath: "inset(0 0 100% 0)" }, "<+=0.2")
        .to(q("[data-icon]"), { xPercent: 800 }, "<")
        .to(q("[data-card]"), { scale: 0, duration: 0.5 }, "<+=0.1")
        .to(win, { clipPath: "inset(0px 0px 0px 0px)", duration: 1.25 })
        .to(bar, { y: -(box.top + bar.offsetHeight), duration: 1.25 }, "<")
        .add(() => window.dispatchEvent(new Event(INTRO_REVEAL)), "<+=0.15")
        .to(el, { clipPath: hole(w, h, w - 64, h - 64), duration: 1.2 }, "<")
        .to(el, { clipPath: hole(w, h, w + 4, h + 4), duration: 0.5 });

      let joking = false;
      const close = q("[data-close]")[0] as HTMLButtonElement;
      const tags = q("[data-tag]") as HTMLElement[];
      const status = q("[data-status]")[0] as HTMLElement;
      const onClose = () => {
        if (joking) return;
        joking = true;
        const before = [tags[0]!.textContent, tags[1]!.textContent, status.textContent];
        gsap.to(tags[0]!, { scrambleText: { text: "<hold-on>" } });
        gsap.to(tags[1]!, { scrambleText: { text: "</hold-on>" } });
        gsap.to(status, { scrambleText: { text: "YOU JUST GOT HERE", chars: "upperCase" } });
        gsap.delayedCall(2, () => {
          gsap.to(tags[0]!, { scrambleText: { text: before[0] ?? "" } });
          gsap.to(tags[1]!, { scrambleText: { text: before[1] ?? "" } });
          gsap.to(status, { scrambleText: { text: before[2] ?? "", chars: "upperCase" } });
          joking = false;
        });
      };
      close.addEventListener("click", onClose);
      return () => close.removeEventListener("click", onClose);
    },
    { scope: ref },
  );

  if (gone) return null;

  return (
    <div ref={ref} className={l.loader} aria-hidden="true">
      <div className={`${l.loaderGrid} graph-paper`} />
      <div className={l.loaderWindow} data-window>
        <div className={l.loaderBar} data-bar>
          <span className={l.loaderTitle}>
            <span className={l.codeTag} data-tag>
              &lt;demo&gt;
            </span>{" "}
            ETH Jakarta 2026{" "}
            <span className={l.codeTag} data-tag>
              &lt;/demo&gt;
            </span>
          </span>
          <button type="button" className={l.loaderClose} data-close tabIndex={-1}>
            <DottedX />
          </button>
        </div>
        <div className={l.loaderCard} data-card>
          <div className={l.rail}>
            <div className={l.railInner}>
              <span className={l.loaderIcon} data-icon>
                <DottedArrow />
              </span>
              <span className={l.loaderText}>
                <span data-status>LOADING REGISTRY…</span>
                <span data-pct>0%</span>
              </span>
            </div>
          </div>
          <div className={l.loaderBlocks} data-blocks>
            {Array.from({ length: BLOCKS }, (_, i) => (
              <span key={i} className={l.loaderBlock} data-block />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** The dotted X / arrow glyphs are part of the Overflow visual language (dot-matrix icons). */
function DottedX() {
  const pts = [
    [0, 0], [1, 1], [2, 2], [3, 3], [4, 4],
    [4, 0], [3, 1], [1, 3], [0, 4],
  ];
  return (
    <svg width="30" height="30" viewBox="-1 -1 6 6" aria-hidden>
      {pts.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.42" fill="currentColor" />
      ))}
    </svg>
  );
}

function DottedArrow() {
  const pts = [
    [0, 2], [0.8, 2], [1.6, 2], [2.4, 2], [3.2, 2], [4, 2],
    [3.2, 1.2], [2.4, 0.4], [3.2, 2.8], [2.4, 3.6],
  ];
  return (
    <svg width="28" height="28" viewBox="-0.6 -0.6 5.2 5.2" aria-hidden>
      {pts.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.32" fill="currentColor" />
      ))}
    </svg>
  );
}

export { DottedArrow, DottedX };
