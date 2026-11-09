"use client";
import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useCoarse } from "@/lib/hooks";
import { pointer } from "@/lib/pointer";

/** section#play "Play" · 1440×812 · Archivo 16px */
function describe(el: Element, r: DOMRect) {
  const cs = getComputedStyle(el);
  const id = el.id ? `#${el.id}` : "";
  const rail = el instanceof HTMLElement && el.dataset.rail ? ` "${el.dataset.rail}"` : "";
  const font = cs.fontFamily.split(",")[0]?.replace(/["']/g, "").trim();
  return `${el.tagName.toLowerCase()}${id}${rail} · ${Math.round(r.width)}×${Math.round(r.height)} · ${font} ${Math.round(parseFloat(cs.fontSize))}px`;
}

/** Devtools-style box around whatever is under the cursor inside <main>. Fine pointers only. */
export function Inspector() {
  const coarse = useCoarse();
  const box = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (coarse) return;
    const main = document.getElementById("main");
    let last: Element | null = null;
    const tick = () => {
      const b = box.current;
      const t = tag.current;
      if (!b || !t || !main) return;
      const hit = pointer.inside ? document.elementFromPoint(pointer.x, pointer.y) : null;
      const el = hit && hit !== main && main.contains(hit) ? hit : null;
      if (!el) {
        if (last) b.style.opacity = "0";
        last = null;
        return;
      }
      const r = el.getBoundingClientRect();
      b.style.opacity = "1";
      b.style.transform = `translate(${r.left}px, ${r.top}px)`;
      b.style.width = `${r.width}px`;
      b.style.height = `${r.height}px`;
      t.style.top = r.top < 24 ? "2px" : "-19px";
      if (el !== last) {
        last = el;
        t.textContent = describe(el, r);
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [coarse]);

  if (coarse) return null;
  return (
    <div
      ref={box}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[50] border border-signal bg-signal/[0.06] opacity-0 transition-opacity duration-150"
    >
      <span
        ref={tag}
        className="absolute left-[-1px] whitespace-nowrap bg-signal px-1.5 py-[3px] font-mono text-[0.625rem] leading-none text-signal-ink"
      />
    </div>
  );
}
