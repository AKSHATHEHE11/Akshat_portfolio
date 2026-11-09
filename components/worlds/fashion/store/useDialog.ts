"use client";
import { useEffect, useRef, type RefObject } from "react";
import { useLenis } from "lenis/react";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

/**
 * Modal behaviour for the quick view and the bag: stops page scroll, moves focus in and back out,
 * traps Tab, and closes on Escape — caught in the capture phase so the world's own Esc (exit world)
 * and ←/→ (switch world) never fire underneath an open dialog.
 */
export function useDialog(open: boolean, onClose: () => void, ref: RefObject<HTMLElement | null>) {
  const lenis = useLenis();
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lenis?.stop();
    const raf = requestAnimationFrame(() => {
      // the first *rendered* candidate: the quick view has one close button per breakpoint
      const pick = (sel: string) => Array.from(ref.current?.querySelectorAll<HTMLElement>(sel) ?? []).find((n) => n.getClientRects().length > 0);
      (pick("[data-autofocus]") ?? pick(FOCUSABLE))?.focus({ preventScroll: true });
    });

    const onKey = (e: KeyboardEvent) => {
      const el = ref.current;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close.current();
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") e.stopPropagation();
      if (e.key !== "Tab" || !el) return;
      const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.getClientRects().length > 0);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!el.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey, true);
      lenis?.start();
      if (prev?.isConnected) prev.focus({ preventScroll: true });
    };
  }, [open, lenis, ref]);
}
