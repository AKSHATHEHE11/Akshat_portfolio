"use client";
import { useEffect, useRef, type RefObject } from "react";
import { ignoreShortcut } from "@/components/work/keys";
import { useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { useNavigate, type NavKind } from "@/lib/transitions";

const NO_SWIPE =
  "input, textarea, select, canvas, video, [role='slider'], [data-swipe='local'], [data-cursor='drag'], [data-lenis-prevent]";

/** Does any ancestor of `el` scroll horizontally? Then a sideways swipe belongs to it. */
function inHorizontalScroller(el: Element | null) {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (n.scrollWidth > n.clientWidth + 1) {
      const o = getComputedStyle(n).overflowX;
      if (o === "auto" || o === "scroll") return true;
    }
  }
  return false;
}

/**
 * Keyboard (←/→ worlds, Esc exit) and touch swipe for the world shell. The on-screen keycap
 * named by data-cap goes down before the transition starts, so the key you pressed is seen.
 * Swipes use passive listeners only and a strict horizontal test, so vertical scrolling never stalls.
 */
export function useWorldNav(bar: RefObject<HTMLElement | null>, prevHref: string, nextHref: string, enabled: boolean) {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const busy = useRef(false);

  useEffect(() => {
    const go = (href: string, kind: NavKind, cap: string) => {
      if (busy.current) return;
      busy.current = true;
      const el = bar.current?.querySelector<HTMLElement>(`[data-cap="${cap}"]`);
      const r = el?.getBoundingClientRect();
      if (el) el.dataset.pressed = "";
      play("press");
      const fire = () => navigate(href, kind, r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined);
      if (reduced) fire();
      else window.setTimeout(fire, 110);
      window.setTimeout(() => {
        busy.current = false;
        if (el) delete el.dataset.pressed;
      }, 1200);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (ignoreShortcut(e)) return;
        e.preventDefault();
        go("/work", "world-exit", "esc");
      } else if (enabled && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        if (ignoreShortcut(e, { arrows: true })) return;
        e.preventDefault();
        if (e.key === "ArrowRight") go(nextHref, "world-next", "next");
        else go(prevHref, "world-prev", "prev");
      }
    };

    let sx = 0;
    let sy = 0;
    let t0 = 0;
    let armed = false;
    const start = (e: TouchEvent) => {
      armed = false;
      if (!enabled || e.touches.length !== 1 || (window.visualViewport?.scale ?? 1) > 1.01) return;
      const t = e.touches[0];
      if (t.clientX < 24 || t.clientX > window.innerWidth - 24) return; // leave edge gestures to the OS
      const el = e.target instanceof Element ? e.target : null;
      if (!el || el.closest(NO_SWIPE) || inHorizontalScroller(el)) return;
      sx = t.clientX;
      sy = t.clientY;
      t0 = e.timeStamp;
      armed = true;
    };
    const end = (e: TouchEvent) => {
      if (!armed) return;
      armed = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      const far = Math.abs(dx) >= Math.max(90, window.innerWidth * 0.26);
      const flat = Math.abs(dx) > Math.abs(dy) * 2.2;
      if (!far || !flat || e.timeStamp - t0 > 700 || document.getSelection()?.toString()) return;
      if (dx < 0) go(nextHref, "world-next", "next");
      else go(prevHref, "world-prev", "prev");
    };
    const cancel = () => {
      armed = false;
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchend", end, { passive: true });
    window.addEventListener("touchcancel", cancel, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", start);
      window.removeEventListener("touchend", end);
      window.removeEventListener("touchcancel", cancel);
    };
  }, [bar, navigate, reduced, prevHref, nextHref, enabled]);
}
