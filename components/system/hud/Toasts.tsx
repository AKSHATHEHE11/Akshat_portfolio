"use client";
import { useEffect, useRef, useState } from "react";
import { Scramble } from "@/components/ui/Scramble";
import { current, EASE_TWEEN, spring } from "@/lib/anim";
import { useIsomorphicLayoutEffect } from "@/lib/hooks";
import { SPRING } from "@/lib/motion";
import { on, system } from "@/lib/system";
import { cn } from "@/lib/utils";

interface Toast {
  id: number;
  text: string;
  /** leaving: plays its exit, then is dropped */
  out?: boolean;
}

const LIFE = 2400;

/** emit("toast", { text }) → "> TEXT" terminal line, bottom centre, ~2.4s. Up to three stack. */
export function Toasts({ raised }: { raised: boolean }) {
  const [items, setItems] = useState<Toast[]>([]);
  const ids = useRef(0);
  const stack = useRef<HTMLDivElement>(null);
  /** where each toast sat last render, measured up from the stack's bottom edge */
  const spots = useRef(new Map<number, number>());

  useEffect(() => {
    const timers = new Set<number>();
    const leave = (id: number) => setItems((list) => list.map((i) => (i.id === id && !i.out ? { ...i, out: true } : i)));
    const off = on<{ text?: string }>("toast", (d) => {
      const text = d?.text?.trim();
      if (!text) return;
      const id = ++ids.current;
      setItems((list) => {
        // the newest two stay, older ones leave
        const drop = new Set(list.filter((i) => !i.out).slice(0, -2).map((i) => i.id));
        return [...list.map((i) => (drop.has(i.id) ? { ...i, out: true } : i)), { id, text }];
      });
      const t = window.setTimeout(() => {
        timers.delete(t);
        leave(id);
      }, LIFE);
      timers.add(t);
    });
    return () => {
      off();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  // layout="position": a toast that the stack pushes up glides there instead of jumping
  useIsomorphicLayoutEffect(() => {
    const box = stack.current;
    if (!box) return;
    const reduced = system.get().reducedMotion;
    const s = spring(SPRING.soft);
    const next = new Map<number, number>();
    const h = box.offsetHeight;
    for (const el of Array.from(box.children) as HTMLElement[]) {
      const id = Number(el.dataset.id);
      const y = el.offsetTop - h;
      next.set(id, y);
      const was = spots.current.get(id);
      if (was === undefined || was === y || reduced) continue;
      const shift = was - y + (parseFloat(getComputedStyle(el).translate.split(" ")[1]) || 0);
      el.getAnimations().forEach((a) => a.id === "toast-shift" && a.cancel());
      const a = el.animate([{ translate: `0 ${shift}px` }, { translate: "0 0" }], { duration: s.duration, easing: s.easing });
      a.id = "toast-shift";
    }
    spots.current = next;
  }, [items]);

  const gone = (id: number) => setItems((list) => list.filter((i) => i.id !== id));

  return (
    <div
      ref={stack}
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed inset-x-0 z-[50] flex flex-col items-center gap-2 px-4 transition-[bottom] duration-700 ease-out-expo",
        raised ? "bottom-28" : "bottom-[max(1.5rem,env(safe-area-inset-bottom))]",
      )}
    >
      {items.map((t) => (
        <Line key={t.id} t={t} onGone={gone} />
      ))}
    </div>
  );
}

function Line({ t, onGone }: { t: Toast; onGone: (id: number) => void }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const enter = useRef<Animation | null>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = system.get().reducedMotion;
    if (!t.out) {
      const s = spring(SPRING.soft);
      enter.current = el.animate(
        reduced ? { opacity: [0, 1] } : { opacity: [0, 1], transform: ["translateY(14px) scale(0.97)", "none"] },
        { duration: s.duration, easing: s.easing },
      );
      return;
    }
    const from = current(el, reduced ? ["opacity"] : ["opacity", "transform"]);
    enter.current?.cancel();
    const exit = el.animate([from, reduced ? { opacity: 0 } : { opacity: 0, transform: "translateY(-8px)" }], {
      duration: 220,
      easing: EASE_TWEEN,
      fill: "forwards",
    });
    exit.onfinish = () => onGone(t.id);
    return () => exit.cancel();
  }, [t.out]);

  return (
    <p
      ref={ref}
      data-id={t.id}
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
    </p>
  );
}
