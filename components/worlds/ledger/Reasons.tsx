"use client";
// The five reason codes, biggest first: signed bars off a centre axis (green right, red left) and the
// arithmetic underneath, so the reasons visibly add up to the score. Rows re-rank as the what-if
// sliders move.
import { motion } from "motion/react";
import { BEZIER } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { BASE, type Explanation } from "./engine";

const signed = (n: number) => `${n < 0 ? "−" : "+"}${Math.abs(n)}`;

export function Reasons({ x, reduced }: { x: Explanation | null; reduced: boolean }) {
  // the biggest reason fills its half of the track; the rest are read against it
  const span = x ? Math.max(40, ...x.top.map((f) => Math.abs(f.points))) : 1;
  return (
    <div>
      <p className="flex items-baseline justify-between gap-4 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--lg-fg)/60">
        <span>Why {x ? x.score : "—"}</span>
        <span>points vs. base {BASE}</span>
      </p>
      <ol className="mt-3 border-t border-(--lg-fg)/12">
        {x
          ? x.top.map((f, i) => (
              <motion.li
                key={f.key}
                layout={!reduced}
                transition={{ layout: { duration: 0.5, ease: BEZIER.out } }}
                className="grid grid-cols-[4.75rem_minmax(0,1fr)_3rem] items-center gap-x-3 gap-y-1.5 border-b border-(--lg-fg)/12 py-2.5 @md:grid-cols-[5.25rem_minmax(0,1fr)_9rem_3rem]"
              >
                <span className="font-mono text-[0.6875rem] tracking-[0.08em] text-(--lg-fg)/70">{f.code}</span>
                <span className="text-[0.875rem] leading-snug first-letter:uppercase">{f.text}</span>
                <span aria-hidden className="relative col-span-3 col-start-1 row-start-2 h-2 @md:col-span-1 @md:col-start-3 @md:row-start-1">
                  <span className="absolute inset-y-[-3px] left-1/2 w-px bg-(--lg-fg)/35" />
                  <motion.span
                    className={cn("absolute inset-y-0 w-1/2", f.points >= 0 ? "left-1/2 bg-(--lg-up)" : "right-1/2 bg-(--lg-down)")}
                    style={{ originX: f.points >= 0 ? 0 : 1 }}
                    initial={reduced ? false : { scaleX: 0 }}
                    animate={{ scaleX: Math.abs(f.points) / span }}
                    transition={{ duration: reduced ? 0 : 0.7, ease: BEZIER.out, delay: reduced ? 0 : i * 0.06 }}
                  />
                </span>
                <span
                  className={cn(
                    "col-start-3 row-start-1 text-right font-mono text-[0.875rem] tabular-nums @md:col-start-4",
                    f.points >= 0 ? "lg-up" : "lg-down",
                  )}
                >
                  {signed(f.points)}
                </span>
              </motion.li>
            ))
          : Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="flex h-[2.75rem] items-center border-b border-(--lg-fg)/12 font-mono text-[0.75rem] text-(--lg-fg)/50">
                R{i + 1} · awaiting statement
              </li>
            ))}
      </ol>
      <p className="mt-3 font-mono text-[0.75rem] leading-relaxed tabular-nums text-(--lg-fg)/70">
        {x ? (
          <>
            {BASE} {x.top.map((f) => signed(f.points)).join(" ")} <span className="text-(--lg-fg)/50">· other {signed(x.other)}</span> ={" "}
            <span className="font-semibold text-(--lg-fg)">{x.score}</span>
          </>
        ) : (
          <>{BASE} + reasons = score</>
        )}
      </p>
    </div>
  );
}
