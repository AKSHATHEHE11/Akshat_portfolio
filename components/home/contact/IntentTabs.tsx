"use client";
import { useRef, type KeyboardEvent } from "react";
import { motion } from "motion/react";
import { contact } from "@/data/contact";
import { SPRING } from "@/lib/motion";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";

type Intent = (typeof contact.intents)[number];

export const tabId = (intent: Intent) => `contact-intent-${intent.id}`;

/**
 * [ I HAVE AN IDEA ] [ I HAVE A PROBLEM ] [ I JUST WANT TO SAY HI ] — a real tablist (arrows, Home/End,
 * selection follows focus). The orange pill slides to the chosen tab and points at the terminal.
 */
export function IntentTabs({
  intents,
  index,
  onChange,
  panelId,
  className,
}: {
  intents: readonly Intent[];
  index: number;
  onChange: (i: number) => void;
  panelId: string;
  className?: string;
}) {
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (i: number) => {
    if (i === index) return;
    play("click");
    onChange(i);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = intents.length;
    const next =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? (i + 1) % n
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? (i - 1 + n) % n
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? n - 1
              : -1;
    if (next < 0) return;
    e.preventDefault();
    select(next);
    tabs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label="What brings you here?" className={cn("grid gap-2.5 lg:grid-cols-3 lg:gap-[clamp(1rem,2vw,2rem)]", className)}>
      {intents.map((intent, i) => {
        const on = i === index;
        return (
          <button
            key={intent.id}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={tabId(intent)}
            aria-selected={on}
            aria-controls={panelId}
            tabIndex={on ? 0 : -1}
            data-cursor="hover"
            onPointerEnter={() => play("tick")}
            onClick={() => select(i)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "relative h-14 rounded-[8px] border-2 px-4 font-display font-bold uppercase leading-[1.1] tracking-[-0.01em] transition-colors duration-200 lg:h-[4.75rem]",
              "text-[clamp(0.9rem,0.2rem+1.2vw,1.4rem)]",
              on ? "border-signal text-signal-ink" : "border-fg text-fg hover:bg-fg/[0.06]",
            )}
          >
            {on && (
              <motion.span layoutId="contact-intent-pill" transition={SPRING.soft} aria-hidden className="absolute -inset-[2px] rounded-[8px] bg-signal">
                {/* speech-bubble notch pointing down at the terminal */}
                <span className="absolute left-1/2 top-full hidden h-3.5 w-6 -translate-x-1/2 bg-signal [clip-path:polygon(0_0,100%_0,50%_100%)] lg:block" />
              </motion.span>
            )}
            <span className="relative text-balance">
              <span aria-hidden>[ </span>
              {intent.label}
              <span aria-hidden> ]</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
