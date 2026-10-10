"use client";

import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { Flip } from "gsap/Flip";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

let registered = false;

/** Registers plugins and the house motion defaults once (DESIGN.md section 7). */
export function setupGsap() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, Flip, ScrambleTextPlugin, useGSAP);
  CustomEase.create("house-ease", "0.525, 0, 0, 1");
  CustomEase.create("house-wiggle", "0.33, 0, 0.67, 1");
  gsap.defaults({ ease: "house-ease", duration: 0.525 });
  registered = true;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export { gsap, Flip, ScrollTrigger, SplitText, useGSAP };
