"use client";
import { site } from "@/data/site";
import { gsap } from "@/lib/gsap";
import { play } from "@/lib/sound";

/** "CHECKING CURIOSITY ........ OK" → label / dot leader / status chip. Anything else is just a label. */
function split(line: string) {
  const m = /^(.*?)\s*(\.{2,})\s*(\S.*)$/.exec(line);
  return m ? { label: m[1], dots: m[2], status: m[3] } : { label: line, dots: "", status: "" };
}

/** Log lines (all but the last); the last boot line is the big "SYSTEM READY." */
export const LINES = site.boot.slice(0, -1).map(split);
export const READY = site.boot[site.boot.length - 1] ?? "";
const CELLS = 24;

const all = (root: HTMLElement, sel: string) => Array.from(root.querySelectorAll<HTMLElement>(sel));
const one = (root: HTMLElement, sel: string) => root.querySelector<HTMLElement>(sel);

function progress(root: HTMLElement, p: number) {
  const fill = one(root, "[data-fill]");
  const pct = one(root, "[data-pct]");
  const lit = Math.round(p * CELLS);
  if (fill) fill.style.clipPath = `inset(0 ${100 - (lit / CELLS) * 100}% 0 0)`;
  if (pct) pct.textContent = `${String(Math.round(p * 100)).padStart(3, "0")}%`;
}

/** Blank screen, ready to (re)play. Text is written straight to the DOM, so React never fights it. */
export function resetBoot(root: HTMLElement) {
  all(root, "[data-label],[data-dots],[data-status],[data-ready]").forEach((el) => (el.textContent = ""));
  all(root, "[data-status]").forEach((el) => el.style.removeProperty("visibility"));
  progress(root, 0);
}

function type(el: HTMLElement | null, text: string, perChar: number) {
  const o = { n: 0 };
  return gsap.to(o, {
    n: text.length,
    duration: Math.max(0.04, text.length * perChar),
    ease: "none",
    onUpdate: () => {
      const n = Math.round(o.n);
      if (!el || el.textContent?.length === n) return;
      el.textContent = text.slice(0, n);
      play("type");
    },
  });
}

/**
 * ~2.1s: power-on flicker → log typed fast (status chips pop) → SYSTEM READY. → the picture collapses
 * into a bright scan line that shrinks to nothing, revealing the page. Reduced motion: the ready line
 * holds for 400ms, then fades.
 */
export function bootTimeline(root: HTMLElement, reduced: boolean, onDone: () => void) {
  const screen = one(root, "[data-screen]");
  const content = one(root, "[data-content]");
  const ready = one(root, "[data-ready]");
  const tl = gsap.timeline({ onComplete: onDone });

  if (reduced) {
    if (ready) ready.textContent = READY;
    progress(root, 1);
    return tl.to(screen, { autoAlpha: 0, duration: 0.3, delay: 0.4, ease: "none" });
  }

  tl.fromTo(content, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.16, ease: "steps(4)" });
  tl.call(() => play("boot"), undefined, 0);

  all(root, "[data-log]").forEach((line, i) => {
    const d = LINES[i];
    if (!d) return;
    tl.add(type(one(line, "[data-label]"), d.label, 0.0055), i ? "+=0.025" : undefined);
    if (d.dots) tl.add(type(one(line, "[data-dots]"), ` ${d.dots} `, 0.0025));
    const status = one(line, "[data-status]");
    if (d.status && status)
      tl.call(
        () => {
          status.textContent = d.status;
          status.style.visibility = "visible";
        },
        undefined,
        "+=0.05",
      );
  });
  tl.add(type(ready, READY, 0.015), "+=0.08");

  const typed = tl.duration();
  tl.eventCallback("onUpdate", () => progress(root, Math.min(1, tl.time() / typed)));

  // CRT switch: squash to a bright line, then the line shrinks to a point.
  tl.addLabel("exit", "+=0.14");
  tl.call(() => void tl.timeScale(1), undefined, "exit"); // a skip fast-forwards the typing, not the collapse
  tl.to(screen, { scaleY: 0.004, duration: 0.3, ease: "power4.in" }, "exit")
    .to(one(root, "[data-beam]"), { opacity: 1, duration: 0.24, ease: "power2.in" }, "exit+=0.06")
    .set(screen, { autoAlpha: 0 })
    .set(one(root, "[data-scanline]"), { autoAlpha: 1 }, "<")
    .to(one(root, "[data-scanline]"), { scaleX: 0, duration: 0.24, ease: "power3.in" })
    .to(one(root, "[data-scanline]"), { autoAlpha: 0, duration: 0.1 }, ">-0.07");

  return tl;
}
