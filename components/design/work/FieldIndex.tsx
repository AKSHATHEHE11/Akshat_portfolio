"use client";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import { useLenis } from "lenis/react";
import { design, type Field, type Work } from "@/data/design";
import { TLink } from "@/components/ui/TLink";
import { useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { pad } from "@/lib/utils";

export const pieces = (n: number) => `${n} ${n === 1 ? "piece" : "pieces"}`;

/**
 * Clicks on #field links: Lenis scrolls (the section's scroll-margin clears the nav and the index) and
 * focus moves to the section, so Tab carries on from there. No history entry per jump.
 */
export function useJump() {
  const lenis = useLenis();
  const reduced = useReducedMotion();
  return (e: MouseEvent<HTMLAnchorElement>) => {
    const el = document.getElementById(e.currentTarget.hash.slice(1));
    if (!el) return;
    e.preventDefault();
    play("click");
    if (lenis) lenis.scrollTo(el, { immediate: reduced });
    else el.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    el.focus({ preventScroll: true });
  };
}

/**
 * The bar that sticks under the nav while the fields scroll by: each live field with its count, the one
 * in view lit, and the way to Behance. On phones the fields scroll sideways under a fixed Behance key.
 */
export function FieldIndex({ fields }: { fields: readonly (Pick<Field, "id" | "title"> & { works: Work[] })[] }) {
  const list = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const jump = useJump();

  // The field in view is the one whose section crosses the middle of the screen.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = e.target.id;
          setActive((a) => (e.isIntersecting ? id : a === id ? null : a));
        }
      },
      { rootMargin: "-45% 0px -54% 0px" },
    );
    for (const f of fields) {
      const el = document.getElementById(f.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [fields]);

  // Phones: scroll the list just enough to show the lit field whole (clear of the fades at both ends;
  // the left one sits in the list's run-in padding); with none lit, back to the start. Measures only
  // when the field changes.
  useEffect(() => {
    const ul = list.current;
    if (!ul) return;
    const a = ul.querySelector<HTMLElement>("[aria-current]");
    const pad = parseFloat(getComputedStyle(ul).paddingLeft);
    const view = ul.clientWidth - 32;
    let left = 0;
    if (a) left = a.offsetLeft - pad < ul.scrollLeft ? a.offsetLeft - pad : Math.max(ul.scrollLeft, a.offsetLeft + a.offsetWidth - view);
    if (left !== ul.scrollLeft) ul.scrollTo({ left, behavior: reduced ? "auto" : "smooth" });
  }, [active, reduced]);

  return (
    <nav className="dz-index" aria-label="Work by field">
      <div className="dz-index-in frame">
        <ul ref={list} className="dz-index-list no-scrollbar" data-swipe="local">
          {fields.map((f) => (
            <li key={f.id}>
              <a
                href={`#${f.id}`}
                onClick={jump}
                aria-current={active === f.id ? "location" : undefined}
                className="dz-index-link label"
                data-cursor="hover"
              >
                {f.title}
                <span aria-hidden>[{pad(f.works.length)}]</span>
                <span className="sr-only">, {pieces(f.works.length)}</span>
              </a>
            </li>
          ))}
        </ul>
        <TLink href={design.behance.href} className="dz-index-behance label hit" data-cursor="hover">
          {design.behance.short}
          <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden />
        </TLink>
      </div>
    </nav>
  );
}
