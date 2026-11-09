"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Scramble } from "@/components/ui/Scramble";
import { SPRING } from "@/lib/motion";
import { on } from "@/lib/system";
import { cn } from "@/lib/utils";

interface Toast {
  id: number;
  text: string;
}

const LIFE = 2400;

/** emit("toast", { text }) → "> TEXT" terminal line, bottom centre, ~2.4s. Up to three stack. */
export function Toasts({ raised }: { raised: boolean }) {
  const [items, setItems] = useState<Toast[]>([]);
  const ids = useRef(0);

  useEffect(() => {
    const timers = new Set<number>();
    const off = on<{ text?: string }>("toast", (d) => {
      const text = d?.text?.trim();
      if (!text) return;
      const id = ++ids.current;
      setItems((list) => [...list.slice(-2), { id, text }]);
      const t = window.setTimeout(() => {
        timers.delete(t);
        setItems((list) => list.filter((i) => i.id !== id));
      }, LIFE);
      timers.add(t);
    });
    return () => {
      off();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed inset-x-0 z-[50] flex flex-col items-center gap-2 px-4 transition-[bottom] duration-700 ease-out-expo",
        raised ? "bottom-28" : "bottom-[max(1.5rem,env(safe-area-inset-bottom))]",
      )}
    >
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.p
            key={t.id}
            layout="position"
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.22 } }}
            transition={SPRING.soft}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-[4px] bg-fg px-3 py-2 font-mono text-[0.75rem] uppercase leading-none tracking-[0.12em] text-bg shadow-float chaos:-rotate-1 chaos:bg-signal chaos:text-signal-ink"
          >
            <span aria-hidden className="text-signal chaos:text-signal-ink">
              &gt;
            </span>
            <span className="sr-only">{t.text}</span>
            <span aria-hidden>
              <Scramble text={t.text} duration={0.5} />
            </span>
            <span aria-hidden className="h-[1.05em] w-[0.55em] animate-blink bg-signal chaos:bg-signal-ink" />
          </motion.p>
        ))}
      </AnimatePresence>
    </div>
  );
}
