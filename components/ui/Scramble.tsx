"use client";
import { useRef, type ElementType } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";

/**
 * Text that decodes itself — the site's "found UI" voice (system labels, coordinates, statuses).
 * trigger "mount": decodes once on mount · "hover": re-decodes on pointer enter · "change": decodes
 * whenever `text` changes.
 */
export function Scramble({
  text,
  as: Tag = "span",
  trigger = "mount",
  duration = 0.9,
  chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>_[]",
  className,
}: {
  text: string;
  as?: ElementType;
  trigger?: "mount" | "hover" | "change";
  duration?: number;
  chars?: string;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  const { contextSafe } = useGSAP(
    () => {
      if (!ref.current || reduced || trigger === "hover") return;
      gsap.to(ref.current, { duration, scrambleText: { text, chars, speed: 0.6, revealDelay: 0.1 }, ease: "none" });
    },
    { dependencies: [text, reduced, trigger], scope: ref },
  );

  const onEnter = contextSafe(() => {
    if (!ref.current || reduced) return;
    gsap.to(ref.current, { duration: duration * 0.7, scrambleText: { text, chars, speed: 0.8 }, ease: "none", overwrite: true });
  });

  return (
    <Tag ref={ref} className={className} onPointerEnter={trigger === "hover" ? onEnter : undefined} aria-label={text}>
      {text}
    </Tag>
  );
}
