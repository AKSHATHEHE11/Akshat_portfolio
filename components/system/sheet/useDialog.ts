"use client";
import { useEffect, useEffectEvent, type RefObject } from "react";
import { useLenis } from "lenis/react";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Modal behaviour for an overlay (menu panel, shortcuts sheet): while `open`, focus moves inside and
 * is trapped there, Esc closes, page scroll stops; on close focus goes back where it came from.
 * Esc is stopped here so nothing underneath (world shell, dev vision) also reacts to it.
 */
export function useDialog(ref: RefObject<HTMLElement | null>, open: boolean, onClose: () => void) {
  const lenis = useLenis();
  const close = useEffectEvent(onClose);

  useEffect(() => {
    if (!open || !lenis) return;
    lenis.stop();
    return () => lenis.start();
  }, [open, lenis]);

  useEffect(() => {
    const el = ref.current;
    if (!open || !el) return;
    const back = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const items = () => Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.getClientRects().length > 0);
    const first = () => (items()[0] ?? el).focus({ preventScroll: true });
    first();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const list = items();
      if (!list.length) return;
      const [a, z] = [list[0], list[list.length - 1]];
      if (e.shiftKey && (document.activeElement === a || document.activeElement === el)) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    };
    // Focus that escapes anyway (click outside, programmatic focus) is pulled back in.
    const onFocusIn = (e: FocusEvent) => {
      if (!el.contains(e.target as Node)) first();
    };

    el.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      el.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocusIn);
      back?.focus({ preventScroll: true });
    };
  }, [open, ref]);
}
