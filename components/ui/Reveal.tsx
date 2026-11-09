"use client";
import { useRef, type ElementType } from "react";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";

type SplitType = "lines" | "words" | "chars";

/**
 * Masked text reveal: text splits into lines/words/chars that rise out of a clip mask
 * when scrolled into view (or immediately with `scroll={false}`). Re-splits on resize/font load.
 * Renders the final text for reduced motion and before JS runs (no invisible content).
 */
export function Reveal({
  as: Tag = "div",
  type = "lines",
  children,
  className,
  delay = 0,
  stagger,
  duration = 1.05,
  scroll = true,
  start = "top 86%",
}: {
  as?: ElementType;
  type?: SplitType;
  children: React.ReactNode;
  className?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
  /** false = play on mount instead of on scroll */
  scroll?: boolean;
  /** ScrollTrigger start */
  start?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || reduced) return;
      const split = SplitText.create(el, {
        type: type === "lines" ? "lines" : type === "words" ? "words,lines" : "chars,words,lines",
        mask: type,
        autoSplit: true,
        onSplit(self) {
          const targets = type === "lines" ? self.lines : type === "words" ? self.words : self.chars;
          return gsap.from(targets, {
            yPercent: 112,
            rotate: type === "chars" ? 8 : 0,
            duration,
            delay,
            ease: "expo.out",
            stagger: stagger ?? (type === "lines" ? 0.09 : type === "words" ? 0.04 : 0.018),
            scrollTrigger: scroll ? { trigger: el, start, once: true } : undefined,
          });
        },
      });
      return () => split.revert();
    },
    { dependencies: [reduced, type, delay, scroll], scope: ref },
  );

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
