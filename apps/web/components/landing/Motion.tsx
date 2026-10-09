"use client";

import Lenis from "lenis";
import { useRef, type ReactNode } from "react";
import { gsap, prefersReducedMotion, ScrollTrigger, setupGsap, SplitText, useGSAP } from "./gsap";

setupGsap();

export const INTRO_DONE = "fakturin:intro-done";
/** Fired when the loader starts opening onto the page; hero motion starts here. */
export const INTRO_REVEAL = "fakturin:intro-reveal";

let lenis: Lenis | null = null;

/** Smooth-scrolls to an element through Lenis when it is running. */
export function scrollToTarget(target: string | HTMLElement) {
  if (lenis) lenis.scrollTo(target, { offset: -68, duration: 1.4 });
  else {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    el?.scrollIntoView({ behavior: "smooth" });
  }
}

function onIntro(event: string, cb: () => void): () => void {
  if (document.documentElement.dataset.intro !== "play") {
    cb();
    return () => undefined;
  }
  const handler = () => cb();
  window.addEventListener(event, handler, { once: true });
  return () => window.removeEventListener(event, handler);
}

/** Runs when the loader has finished (or immediately if it was skipped). */
export function whenIntroDone(cb: () => void): () => void {
  return onIntro(INTRO_DONE, cb);
}

/** Runs when the page starts showing through the loader (or immediately). */
export function whenIntroReveal(cb: () => void): () => void {
  return onIntro(INTRO_REVEAL, cb);
}

/**
 * Landing choreography: a React port of the overflow.sui.io animation script
 * (DESIGN.md section 7). Behavior is declared in markup with data attributes.
 */
export function Motion({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = document.documentElement;
      const reduced = prefersReducedMotion();
      const q = gsap.utils.selector(scope);

      // Nav state is page-level; this page owns it while mounted. Like the source, the
      // nav takes the theme of whichever section sits under its vertical midline.
      const sections = q("[data-theme-section]") as HTMLElement[];
      const syncTheme = () => {
        const mid = 34;
        // At the very top the nav sits above the first section: default to light.
        let theme = "light";
        for (const section of sections) {
          const r = section.getBoundingClientRect();
          if (r.top <= mid && r.bottom >= mid) {
            theme = section.dataset.themeSection ?? "light";
            break;
          }
        }
        if (root.dataset.themeNav !== theme) root.dataset.themeNav = theme;
      };
      root.dataset.themeNav = "light";
      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => {
          root.dataset.scrollDir = self.direction === 1 ? "down" : "up";
          root.dataset.scrolled = String(self.scroll() > 80);
          syncTheme();
        },
        onRefresh: syncTheme,
      });
      const end = q("[data-scroll-end]")[0];
      if (end) {
        ScrollTrigger.create({
          trigger: end,
          start: "top bottom",
          onEnter: () => (root.dataset.scrollEnd = "true"),
          onLeaveBack: () => (root.dataset.scrollEnd = "false"),
        });
      }

      if (reduced) {
        return () => {
          ["themeNav", "scrollDir", "scrolled", "scrollEnd"].forEach((k) => delete root.dataset[k]);
        };
      }

      // Smooth scroll, synced to GSAP's ticker like the source.
      lenis = new Lenis({ autoRaf: false });
      lenis.on("scroll", ScrollTrigger.update);
      const raf = (time: number) => lenis?.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
      if (root.dataset.intro === "play") lenis.stop();
      const offIntro = whenIntroDone(() => {
        lenis?.start();
        ScrollTrigger.refresh();
      });

      // Listeners registered outside GSAP's context; removed on cleanup.
      const offs: (() => void)[] = [];

      // Word reveals: yPercent 25 -> 0, stagger 0.05, at top 90%.
      (q('[data-split="words"]') as HTMLElement[]).forEach((el) => {
        const split = SplitText.create(el, { type: "words", wordsClass: "split-word" });
        gsap.set(split.words, { autoAlpha: 0, yPercent: 25 });
        const play = () =>
          gsap.to(split.words, {
            autoAlpha: 1,
            yPercent: 0,
            stagger: Number(el.dataset.stagger ?? 0.05),
            delay: Number(el.dataset.delay ?? 0),
          });
        if (el.dataset.splitTrigger === "intro") offs.push(whenIntroReveal(() => gsap.delayedCall(0.35, play)));
        else ScrollTrigger.create({ trigger: el, start: "top 90%", once: true, onEnter: play });
      });

      // Ghost loader: each text line hidden under a pulsing block, then revealed.
      (q("[data-ghost]") as HTMLElement[]).forEach((el) => {
        const dark = el.dataset.ghost === "dark";
        const split = SplitText.create(el, { type: "lines", linesClass: "split-line" });
        split.lines.forEach((line, i) => {
          const block = document.createElement("span");
          block.className = "ghost-block";
          block.style.background = dark ? "#31404e" : "#dfdfdf";
          line.appendChild(block);
          gsap
            .timeline({ scrollTrigger: { trigger: line, start: "top 92%", once: true } })
            .to(block, {
              backgroundColor: dark ? "#5a6d7f" : "#bbbec0",
              duration: 0.22,
              ease: "power1.inOut",
              repeat: 1,
              yoyo: true,
              delay: 0.06 * i,
            })
            .to(block, { autoAlpha: 0, duration: 0.3, ease: "power2.inOut" });
        });
      });

      // Scramble-in for short mono strings (rejection messages, tags).
      (q("[data-scramble]") as HTMLElement[]).forEach((el) => {
        const text = el.textContent ?? "";
        ScrollTrigger.create({
          trigger: el,
          start: "top 85%",
          once: true,
          onEnter: () =>
            gsap.fromTo(
              el,
              { scrambleText: { text: " ", chars: "upperCase" } },
              { scrambleText: { text, chars: "upperCase", speed: 0.6 }, duration: 1.2, ease: "none" },
            ),
        });
      });

      // Card rows: yPercent 40 -> 0, stagger 0.05, 0.725s, at top 80%.
      (q("[data-reveal-row]") as HTMLElement[]).forEach((row) => {
        const items = row.querySelectorAll("[data-reveal-item]");
        gsap.fromTo(
          items,
          { yPercent: 40, autoAlpha: 0 },
          {
            yPercent: 0,
            autoAlpha: 1,
            stagger: 0.05,
            duration: 0.725,
            scrollTrigger: { trigger: row, start: "top 80%", once: true },
          },
        );
      });

      // Counting numbers (money cards).
      (q("[data-count]") as HTMLElement[]).forEach((el) => {
        const target = Number(el.dataset.count);
        const prefix = el.dataset.prefix ?? "";
        const suffix = el.dataset.suffix ?? "";
        const state = { v: 0 };
        el.textContent = `${prefix}0${suffix}`;
        gsap.to(state, {
          v: target,
          duration: 1.6,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
          onUpdate: () => {
            el.textContent = prefix + Math.round(state.v).toLocaleString("en-US") + suffix;
          },
        });
      });

      // Bars that grow from the left.
      (q("[data-grow]") as HTMLElement[]).forEach((bar) => {
        gsap.fromTo(
          bar.children,
          { scaleX: 0 },
          {
            scaleX: 1,
            transformOrigin: "left center",
            stagger: 0.25,
            duration: 0.9,
            scrollTrigger: { trigger: bar, start: "top 85%", once: true },
          },
        );
      });

      // Wiggle while in view (random drift, "sui-wiggle").
      (q("[data-wiggle]") as HTMLElement[]).forEach((el) => {
        const amp = Number(el.dataset.wiggle || 5);
        const tl = gsap
          .timeline({ repeat: -1, repeatRefresh: true, paused: true })
          .to(el, {
            x: `random(${-amp}, ${amp})`,
            y: `random(${-amp}, ${amp})`,
            duration: gsap.utils.random(1.2, 2),
            ease: "sui-wiggle",
          });
        ScrollTrigger.create({
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => (self.isActive ? tl.play() : tl.pause()),
        });
      });

      // Trigger positions depend on final font metrics and image sizes.
      const refresh = () => ScrollTrigger.refresh();
      document.fonts?.ready.then(refresh);
      window.addEventListener("load", refresh);

      const mm = gsap.matchMedia();
      mm.add("(min-width: 992px)", () => {
        // Parallax: yPercent start -> end, scrubbed.
        (q("[data-parallax]") as HTMLElement[]).forEach((el) => {
          const [from, to] = (el.dataset.parallax || "20,-20").split(",").map(Number);
          gsap.fromTo(
            el,
            { yPercent: from },
            {
              yPercent: to,
              ease: "none",
              scrollTrigger: {
                trigger: el.parentElement ?? el,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            },
          );
        });

        // Images grow into place and settle (gpt-taste scale-in).
        (q("[data-scale-in]") as HTMLElement[]).forEach((el) => {
          gsap.fromTo(
            el,
            { scale: 0.86 },
            {
              scale: 1,
              ease: "none",
              scrollTrigger: { trigger: el, start: "top bottom", end: "center center", scrub: true },
            },
          );
        });
      });

      mm.add("(min-width: 992px) and (hover: hover)", () => {
        // Magnetic buttons: follow the pointer, spring back elastically.
        const cleanups: (() => void)[] = [];
        (q("[data-magnetic]") as HTMLElement[]).forEach((el) => {
          const strength = Number(el.dataset.magnetic || 30);
          const move = (e: PointerEvent) => {
            const r = el.getBoundingClientRect();
            const x = ((e.clientX - r.left) / r.width - 0.5) * (strength / 16);
            const y = ((e.clientY - r.top) / r.height - 0.5) * (strength / 16);
            gsap.to(el, { x: `${x}em`, y: `${y}em`, ease: "power4.out", duration: 1.6 });
          };
          const leave = () =>
            gsap.to(el, { x: 0, y: 0, ease: "elastic.out(1, 0.3)", duration: 1.6 });
          el.addEventListener("pointermove", move);
          el.addEventListener("pointerleave", leave);
          cleanups.push(() => {
            el.removeEventListener("pointermove", move);
            el.removeEventListener("pointerleave", leave);
          });
        });
        return () => cleanups.forEach((c) => c());
      });

      return () => {
        offs.forEach((off) => off());
        window.removeEventListener("load", refresh);
        offIntro();
        gsap.ticker.remove(raf);
        lenis?.destroy();
        lenis = null;
        ["themeNav", "scrollDir", "scrolled", "scrollEnd"].forEach((k) => delete root.dataset[k]);
      };
    },
    { scope },
  );

  return (
    <div ref={scope} className="landing-root">
      {children}
    </div>
  );
}
