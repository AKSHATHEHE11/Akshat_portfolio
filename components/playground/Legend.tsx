"use client";
import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AppWindow, Bug, Keyboard, ListChecks, Orbit, Package, Stamp, X, type LucideIcon } from "lucide-react";
import { Kbd } from "@/components/ui/marks";
import { SPRING } from "@/lib/motion";
import { play } from "@/lib/sound";
import { LEGEND } from "./copy";

const ICON: Record<string, LucideIcon> = { tray: Package, win: AppWindow, key: Keyboard, bug: Bug, stamp: Stamp, well: Orbit, form: ListChecks };

/** The "?" key on the mat and the printed legend it opens: what each toy does, and its keys. */
export function Legend() {
  const [open, setOpen] = useState(false);
  const id = useId();
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (focus: boolean) => {
      setOpen(false);
      play("close");
      if (focus) btn.current?.focus();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      close(true);
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !btn.current?.contains(t)) close(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <div className="pg-legend-wrap">
      <button
        ref={btn}
        type="button"
        className="pg-keybtn"
        aria-expanded={open}
        aria-controls={id}
        aria-label="Legend: what everything on the mat does"
        data-chaos-escape
        onClick={() => {
          setOpen((o) => !o);
          play(open ? "close" : "open");
        }}
      >
        ?
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            ref={panel}
            id={id}
            role="region"
            aria-label="Legend"
            className="pg-legend"
            initial={{ opacity: 0, scale: 0.92, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4, transition: { duration: 0.14 } }}
            transition={SPRING.soft}
            data-lenis-prevent
          >
            <div className="pg-legend-head">
              <span className="label">Legend</span>
              <button type="button" className="pg-legend-x hit" aria-label="Close legend" onClick={() => setOpen(false)}>
                <X size={14} strokeWidth={2} />
              </button>
            </div>
            <ul>
              {LEGEND.map((l) => {
                const Icon = ICON[l.id];
                return (
                  <li key={l.id}>
                    <Icon size={16} strokeWidth={1.6} aria-hidden />
                    <p>
                      <b>{l.name}</b> {l.line}
                    </p>
                    <span className="pg-legend-keys">
                      {l.keys.map((k) => (
                        <Kbd key={k}>{k}</Kbd>
                      ))}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="pg-legend-foot">
              <Kbd>R</Kbd> resets the bench. Nothing here is saved except your best bug score.
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
