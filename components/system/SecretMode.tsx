"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { EASE_TWEEN, usePresence } from "@/lib/anim";
import { useIsomorphicLayoutEffect } from "@/lib/hooks";
import { useSystem } from "@/lib/system";
import { closeDevVision } from "./secret/actions";

// 99% of visitors never find it, so it isn't in anyone's bundle until they do.
const DevVision = dynamic(() => import("./secret/DevVision"), { ssr: false });

/**
 * "Dev vision" — the blueprint under the site: grid, outlines, live tokens, an element inspector.
 * On with a triple-click on the logo or Shift+D. Esc leaves it — but an open dialog gets Esc first,
 * and a world underneath never sees it.
 */
export default function SecretMode() {
  const secret = useSystem((s) => s.secret);
  const ref = useRef<HTMLDivElement>(null);
  const { mounted, done } = usePresence(secret);

  // it fades out when folded away (it arrives through its own panels)
  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (secret) {
      el.getAnimations().forEach((a) => a.cancel());
      return;
    }
    el.animate({ opacity: [1, 0] }, { duration: 250, easing: EASE_TWEEN, fill: "forwards" }).onfinish = done;
  }, [secret, done]);

  useEffect(() => {
    if (!secret) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || (e.target instanceof Element && e.target.closest('[aria-modal="true"]'))) return;
      e.preventDefault();
      e.stopPropagation();
      closeDevVision();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [secret]);

  return mounted ? (
    <div ref={ref}>
      <DevVision />
    </div>
  ) : null;
}
