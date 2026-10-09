"use client";

import { useRef } from "react";
import { gsap, prefersReducedMotion, ScrollTrigger, setupGsap, useGSAP } from "./gsap";
import l from "./landing.module.css";

setupGsap();

const COLORS = ["#55db9c", "#00bfff", "#7a69fa"];

type Cell = { x: number; y: number; color: string; alpha: number };

/** Interactive graph paper: hovered cells light up and fade (overflow "events" grid). */
export function GridCanvas() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const host = ref.current!;
      const canvas = document.createElement("canvas");
      host.appendChild(canvas);
      const ctx = canvas.getContext("2d")!;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let cells: Cell[] = [];
      let size = 0;
      let cols = 0;
      let last = -1;

      const layout = () => {
        const w = host.offsetWidth;
        const h = host.offsetHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cols = w < 768 ? 7 : 28;
        size = w / cols;
        const rows = Math.ceil(h / size);
        cells = [];
        for (let r = 0; r < rows; r++)
          for (let c = 0; c < cols; c++) cells.push({ x: c * size, y: r * size, color: "#fff", alpha: 0 });
      };

      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(77,162,255,0.35)";
        for (const c of cells) {
          if (c.alpha > 0) {
            ctx.globalAlpha = c.alpha;
            ctx.fillStyle = c.color;
            ctx.fillRect(c.x, c.y, size, size);
            ctx.globalAlpha = 1;
          }
          ctx.strokeRect(c.x, c.y, size, size);
        }
      };

      layout();
      draw();

      // Only redraw while the section is on screen.
      let active = false;
      const tick = () => draw();
      const st = ScrollTrigger.create({
        trigger: host,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => {
          if (self.isActive && !active) gsap.ticker.add(tick);
          if (!self.isActive && active) gsap.ticker.remove(tick);
          active = self.isActive;
        },
      });

      const hoverable = !prefersReducedMotion() && window.matchMedia("(hover: hover)").matches;
      const move = (e: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        const col = Math.floor((e.clientX - r.left) / size);
        const row = Math.floor((e.clientY - r.top) / size);
        const i = row * cols + col;
        const cell = cells[i];
        if (!cell || i === last) return;
        last = i;
        cell.color = COLORS[Math.floor(Math.random() * COLORS.length)]!;
        gsap.killTweensOf(cell);
        gsap.to(cell, { alpha: 1, duration: 0.1 });
        gsap.to(cell, { alpha: 0, duration: 2, delay: 0.5, ease: "power1.out" });
      };
      const resize = () => {
        layout();
        draw();
      };
      if (hoverable) host.parentElement?.addEventListener("pointermove", move);
      window.addEventListener("resize", resize);

      return () => {
        st.kill();
        gsap.ticker.remove(tick);
        host.parentElement?.removeEventListener("pointermove", move);
        window.removeEventListener("resize", resize);
        canvas.remove();
      };
    },
    { scope: ref },
  );

  return <div ref={ref} className={l.gridCanvas} aria-hidden />;
}
