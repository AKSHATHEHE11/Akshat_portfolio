"use client";
import { gsap } from "@/lib/gsap";

/**
 * Tosses a copy of `source` (a garment drawing) into `target` (the bag) along a curved path:
 * x leaves fast, y arrives fast, so the path bends like a throw. Calls onLand when it drops in.
 */
export function flyToBag(source: Element, target: Element, onLand: () => void) {
  const s = source.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  if (!s.width || !t.width) return onLand();

  const ghost = source.cloneNode(true) as HTMLElement | SVGElement;
  // the copy fills its wrapper exactly, without the source's layout offsets, hover transforms or chaos hooks
  Object.assign(ghost.style, { position: "static", inset: "auto", width: "100%", height: "100%", transform: "none", rotate: "none", scale: "none", translate: "none" });
  for (const a of Array.from(ghost.attributes)) if (a.name.startsWith("data-")) ghost.removeAttribute(a.name);
  const wrap = document.createElement("div");
  wrap.setAttribute("aria-hidden", "true");
  Object.assign(wrap.style, {
    position: "fixed",
    left: `${s.left}px`,
    top: `${s.top}px`,
    width: `${s.width}px`,
    height: `${s.height}px`,
    zIndex: "70",
    pointerEvents: "none",
    filter: "drop-shadow(0 18px 22px rgba(20,22,28,.28))",
  });
  wrap.appendChild(ghost);
  document.body.appendChild(wrap);

  const dx = t.left + t.width / 2 - (s.left + s.width / 2);
  const dy = t.top + t.height / 2 - (s.top + s.height / 2);
  const end = Math.max(0.06, (Math.min(t.width, t.height) / Math.max(s.width, s.height)) * 0.9);

  gsap
    .timeline({
      onComplete: () => {
        wrap.remove();
        onLand();
      },
    })
    .to(wrap, { scale: 1.08, rotation: dx > 0 ? -4 : 4, duration: 0.16, ease: "power2.out" })
    .to(wrap, { x: dx, duration: 0.8, ease: "power2.out" }, 0.12)
    .to(wrap, { y: dy, duration: 0.8, ease: "power3.in" }, 0.12)
    .to(wrap, { scale: end, rotation: dx > 0 ? 32 : -32, duration: 0.8, ease: "power2.in" }, 0.12)
    .to(wrap, { opacity: 0, duration: 0.1 }, 0.84);
}
