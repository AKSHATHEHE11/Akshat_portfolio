"use client";
import { useEffect, useRef, useState } from "react";
import { Archive } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { liveness, micro, useThrownOn, type DemoProps } from "./shared";

const MAIL = ["Invoice 2041 is paid", "Standup moved to 10:30", "Build 318 is green", "Rajma at 1?"];
const ALL = MAIL.map((_, i) => i);

/**
 * MOTION IS MEANING — one inbox, one Archive key. Rule on: the mail flies into the Archive tray and
 * the list closes the gap it left. Rule off: it spins, pops and is gone; where to is anyone's guess.
 */
export function MotionDemo({ on, quiet }: DemoProps) {
  const root = useRef<HTMLDivElement>(null);
  const tray = useRef<HTMLSpanElement>(null);
  const busy = useRef(false);
  const [rows, setRows] = useState(ALL);
  const [archived, setArchived] = useState(0);
  const reduced = useReducedMotion();
  const { contextSafe } = useGSAP({ scope: root });

  const archive = contextSafe((id: number) => {
    const row = root.current?.querySelector<HTMLElement>(`[data-row="${id}"]`);
    const fly = row?.firstElementChild as HTMLElement | null;
    const bin = tray.current;
    if (!row || !fly || !bin || busy.current) return;
    busy.current = true;
    const done = () => {
      busy.current = false;
      setRows((r) => r.filter((x) => x !== id));
      setArchived((n) => n + 1);
    };
    if (reduced) return done();

    if (on) {
      const a = fly.getBoundingClientRect();
      const b = bin.getBoundingClientRect();
      play("close");
      gsap
        .timeline({ onComplete: done })
        .set(row, { zIndex: 2 })
        .to(fly, {
          x: b.left + b.width / 2 - a.right,
          y: b.top + b.height / 2 - (a.top + a.height / 2),
          scale: 0.06,
          opacity: 0.6,
          transformOrigin: "100% 50%",
          duration: 0.62,
          ease: "power3.inOut",
        })
        .to(row, { height: 0, duration: 0.42, ease: "power3.inOut" }, 0.2)
        .fromTo(bin, { scale: 1 }, { scale: 1.3, duration: 0.13, yoyo: true, repeat: 1, ease: "power2.out", onStart: () => play("drop") }, 0.55);
    } else {
      play("glitch");
      gsap
        .timeline({ onComplete: done })
        .to(fly, { rotate: -7, scale: 1.1, duration: 0.14, ease: "power2.out" })
        .to(fly, { rotate: 400, scale: 0, opacity: 0, duration: 0.55, ease: "back.in(1.7)" });
    }
  });

  // just thrown on: archive the top mail so the difference shows without asking
  useThrownOn(on, () => rows.length && archive(rows[0]));

  // inbox zero → the mail comes back so there is always something to archive
  useEffect(() => {
    if (rows.length) return;
    const id = window.setTimeout(() => setRows(ALL), 1300);
    return () => window.clearTimeout(id);
  }, [rows.length]);

  return (
    <div ref={root} role="group" aria-label="Demo: an inbox with an Archive key" className="flex h-full flex-col px-[clamp(0.75rem,4cqw,1.4rem)] py-3">
      <div className="flex items-center justify-between gap-3 border-b border-ink/15 pb-2.5">
        <p className="flex items-baseline gap-2 font-display text-[1.05rem] font-[750] tracking-[-0.01em]">
          Inbox <span className="font-mono text-[0.75rem] font-medium tabular-nums text-smoke">{rows.length}</span>
        </p>
        <span
          ref={tray}
          aria-live={liveness(quiet)}
          aria-atomic
          className={cn(micro, "flex items-center gap-1.5 rounded-full border border-ink/25 bg-bone px-2.5 py-1.5")}
        >
          <Archive aria-hidden size={13} strokeWidth={2} />
          Archive
          <span className="tabular-nums text-[#b23a0a]">{archived}</span>
        </span>
      </div>
      <ul className="relative">
        {rows.map((id) => (
          <li key={id} data-row={id} className="relative">
            <div className="tk-rise flex items-center gap-3 border-b border-ink/10 bg-paper py-[0.42rem]" style={{ "--i": id } as React.CSSProperties}>
              <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-signal" />
              <span className="min-w-0 flex-1 truncate text-[0.95rem] leading-tight">{MAIL[id]}</span>
              <button
                type="button"
                aria-label={`Archive “${MAIL[id]}”`}
                data-cursor="hover"
                data-cursor-label="ARCHIVE"
                onClick={() => archive(id)}
                className="hit grid size-8 shrink-0 place-items-center rounded-[6px] border border-ink/20 text-ink transition-colors hover:bg-ink hover:text-paper"
              >
                <Archive aria-hidden size={15} strokeWidth={1.75} />
              </button>
            </div>
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className={cn(micro, "m-auto text-smoke")}>Inbox zero. Refilling…</p>}
    </div>
  );
}
