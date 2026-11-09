"use client";
// "SYSTEM STATUS ● BUILDING (i)" — opens a hardware readout: roles, meters, counters, availability.
import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Info } from "lucide-react";
import { profile } from "@/data/profile";
import { site } from "@/data/site";
import { Led } from "@/components/ui/marks";
import { Scramble } from "@/components/ui/Scramble";
import { BEZIER } from "@/lib/motion";
import { play } from "@/lib/sound";
import { cn, pad } from "@/lib/utils";

const SEGMENTS = 20;

export function Status({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const { status } = profile;

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  const toggle = () => {
    play(open ? "close" : "open");
    setOpen(!open);
  };

  return (
    <div ref={wrap} data-fade className={cn("relative z-[20] w-fit", className)}>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={toggle}
        data-cursor="hover"
        className="label group/st inline-flex h-10 coarse:h-11 items-center gap-3 rounded-full border border-line bg-bg/75 pl-4 pr-1.5 text-fg backdrop-blur-sm transition-colors duration-200 hover:border-line-strong"
      >
        <span className="text-fg-muted">System status</span>
        <span className="inline-flex items-center gap-2">
          <Led tone="go" />
          {status.mode}
        </span>
        <span
          data-chaos-escape
          className={cn(
            "grid size-7 place-items-center rounded-full border border-line transition-colors duration-200",
            open ? "bg-fg text-bg" : "group-hover/st:bg-fg group-hover/st:text-bg",
          )}
        >
          <Info size={14} strokeWidth={1.75} aria-hidden />
          <span className="sr-only">{open ? "Hide" : "Show"} status readout</span>
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            id={id}
            role="region"
            aria-label="System status readout"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.32, ease: BEZIER.out }}
            style={{ transformOrigin: "24px 0" }}
            className="absolute left-0 top-[calc(100%+0.5rem)] w-[min(22.5rem,calc(100vw-2*var(--margin)))] overflow-hidden rounded-[12px] border border-line bg-surface text-fg shadow-float"
          >
            <div className="label flex items-center justify-between border-b border-line px-4 py-3 text-fg-muted">
              <span>{site.version}</span>
              <span className="inline-flex items-center gap-2 text-fg">
                <Led tone="go" />
                {status.mode}
              </span>
            </div>

            <div className="space-y-4 px-4 py-4">
              <p className="text-[0.95rem] leading-snug">
                {profile.roles.map((r, i) => (
                  <span key={r}>
                    {i ? <span className="px-1.5 text-fg-muted">/</span> : null}
                    {i === 1 ? <span className="serif-accent text-[1.1em]">{r}</span> : r}
                  </span>
                ))}
              </p>

              <ul className="space-y-2.5" aria-label="Levels">
                {status.meters.map((m, mi) => {
                  const lit = Math.round((m.value / 100) * SEGMENTS);
                  return (
                    <li key={m.label} className="grid grid-cols-[5.5rem_1fr_2.25rem] items-center gap-3">
                      <span className="label text-fg-muted">{m.label}</span>
                      <span className="flex h-3 gap-[3px]" aria-hidden>
                        {Array.from({ length: SEGMENTS }, (_, i) => (
                          <motion.span
                            key={i}
                            className={cn("h-full flex-1 rounded-[1px]", i < lit ? (i >= SEGMENTS - 3 ? "bg-signal" : "bg-fg") : "bg-line")}
                            initial={{ opacity: 0.15, scaleY: 0.4 }}
                            animate={{ opacity: 1, scaleY: 1 }}
                            transition={{ delay: 0.08 + mi * 0.06 + (i < lit ? i * 0.018 : 0.3), duration: 0.18 }}
                          />
                        ))}
                      </span>
                      <span className="text-right font-mono text-[0.8125rem] tabular-nums">
                        <Scramble text={String(m.value)} duration={0.6} chars="0123456789" />
                        <span className="sr-only"> percent</span>
                      </span>
                    </li>
                  );
                })}
              </ul>

              <dl className="grid grid-cols-4 border-y border-line">
                {status.counters.map((c, i) => (
                  <div key={c.label} className={cn("flex flex-col-reverse py-3", i && "border-l border-line pl-3")}>
                    <dt className="label mt-1.5 text-fg-muted">{c.label}</dt>
                    <dd className="font-display text-[1.6rem] font-[780] leading-none tabular-nums tracking-[-0.03em]">{pad(c.value)}</dd>
                  </div>
                ))}
              </dl>

              <p className="flex items-start gap-2.5 text-[0.875rem] leading-snug text-fg-muted">
                <Led tone={profile.availability.open ? "go" : "fg"} className="mt-[0.4em]" />
                {profile.availability.label}
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
