"use client";
// Decisions as journal vouchers. Each call I made is a voucher with two possible postings: what an
// option cost goes in the debit column, what it bought in the credit column. Post one to read its
// narration; post the one I shipped and it's stamped with the why. Post all four as shipped and the
// books balance. Chaos: entries land in the wrong columns.
import { useState } from "react";
import { motion } from "motion/react";
import { useChaos, useReducedMotion } from "@/lib/hooks";
import { BEZIER } from "@/lib/motion";
import { play } from "@/lib/sound";
import type { Decision } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { LedgerScene } from "./scene";
import { Stamp } from "./Stamp";

type Voucher = LedgerScene["journal"][number];

// postings are written in: ink settling into the paper
const ENTER = { opacity: 0, y: 8, filter: "blur(3px)" };
const SHOWN = { opacity: 1, y: 0, filter: "blur(0px)" };

export function Journal({ decisions, journal }: { decisions: Decision[]; journal: LedgerScene["journal"] }) {
  const chaos = useChaos();
  const [posted, setPosted] = useState<(number | null)[]>(() => decisions.map(() => null));
  const shipped = decisions.filter((d, i) => posted[i] === d.chosen).length;
  const balanced = shipped === decisions.length && !chaos;

  const post = (i: number, o: number) => {
    setPosted((p) => p.map((v, k) => (k === i ? o : v)));
    play(o === decisions[i].chosen ? "toggle-on" : "toggle-off");
  };

  return (
    <section aria-labelledby="lg-journal" className="frame relative pt-28 md:pt-40">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <h2
          id="lg-journal"
          data-chaos-type
          className="font-display text-[clamp(3rem,1rem+8vw,10rem)] font-[800] leading-[0.82] tracking-[-0.045em] [font-variation-settings:'wdth'_70]"
        >
          Journal
        </h2>
        <p className="max-w-[36ch] text-[1.0625rem] leading-snug text-(--lg-fg)/70">
          Four calls, four vouchers. Post either side: what it cost is debited, what it bought is credited.
        </p>
      </div>

      <div className="mt-12 md:mt-16">
        <div
          aria-hidden
          className="hidden grid-cols-[8rem_minmax(0,1fr)_12rem_12rem] gap-x-8 border-b-2 border-(--lg-fg) pb-2 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--lg-fg)/60 lg:grid"
        >
          <span>Voucher</span>
          <span>Particulars</span>
          <span className="text-right">Dr · it cost</span>
          <span className="text-right">Cr · it bought</span>
        </div>
        <ol className="max-lg:border-t-2 max-lg:border-(--lg-fg)">
          {decisions.map((d, i) => (
            <Entry key={d.question} d={d} v={journal[i]} index={i} pick={posted[i]} chaos={chaos} onPost={post} />
          ))}
        </ol>

        {/* the totals line: an accountant's double rule */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-8 pt-4 lg:grid-cols-[8rem_minmax(0,1fr)_24rem]">
          <span className="hidden font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--lg-fg)/60 lg:block">Total</span>
          <p role="status" className="font-mono text-[0.75rem] uppercase leading-relaxed tracking-[0.12em]">
            {chaos ? (
              <span className="lg-down">Doesn’t balance · debits are posting to credits</span>
            ) : balanced ? (
              <span className="lg-up">Books balance · all {decisions.length} posted as shipped</span>
            ) : (
              <span className="text-(--lg-fg)/70">
                {shipped} of {decisions.length} posted as shipped
              </span>
            )}
          </p>
          <span
            aria-hidden
            className={cn("h-[7px] w-24 border-y-2 border-b-[1px] transition-colors duration-500 lg:w-full", balanced ? "border-(--lg-up)" : "border-(--lg-fg)/70")}
          />
        </div>
      </div>
    </section>
  );
}

interface EntryProps {
  d: Decision;
  v: Voucher | undefined;
  index: number;
  pick: number | null;
  chaos: boolean;
  onPost: (i: number, o: number) => void;
}

function Entry({ d, v, index, pick, chaos, onPost }: EntryProps) {
  const reduced = useReducedMotion();
  const line = pick === null ? null : v?.lines[pick];
  const [dr, cr] = line ? (chaos ? [line.cr, line.dr] : [line.dr, line.cr]) : [null, null];
  const isShipped = pick === d.chosen;

  return (
    <li className="relative border-b border-(--lg-fg)/14 py-8 lg:py-10">
      <fieldset className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-[8rem_minmax(0,1fr)_12rem_12rem] lg:gap-x-8">
        <legend className="sr-only">{d.question}</legend>
        <p aria-hidden className="col-span-2 font-mono text-[0.6875rem] uppercase leading-relaxed tracking-[0.12em] lg:col-span-1">
          <span className="text-(--lg-signal)">{v?.ref}</span>
          <span className="text-(--lg-fg)/55 max-lg:ml-3 lg:block">{v?.date}</span>
        </p>

        <div className="col-span-2 min-w-0 lg:col-span-1">
          <p aria-hidden className="max-w-[24ch] text-[clamp(1.45rem,1.1rem+1.1vw,2.1rem)] font-[680] leading-[1.02] tracking-[-0.022em] [font-variation-settings:'wdth'_84]">
            {d.question}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {d.options.map((o, k) => (
              <label
                key={o.label}
                data-cursor="hover"
                onPointerEnter={() => play("tick")}
                className={cn(
                  "relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[4px] border px-3.5 py-2 text-[0.9375rem] font-[560] leading-tight transition-colors duration-200",
                  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--lg-signal)",
                  pick === k ? "border-(--lg-fg) bg-(--lg-fg) text-(--lg-bg)" : "border-(--lg-fg)/25 text-(--lg-fg)/80 hover:border-(--lg-fg)/70 hover:text-(--lg-fg)",
                )}
              >
                <input type="radio" name={`lg-jv-${index}`} value={k} checked={pick === k} onChange={() => onPost(index, k)} className="sr-only" />
                <span aria-hidden className={cn("font-mono text-[0.6875rem]", pick === k ? "opacity-70" : "text-(--lg-signal)")}>
                  {pick === k ? "●" : "○"}
                </span>
                {o.label}
              </label>
            ))}
          </div>
        </div>

        <Column label="Dr · it cost" value={dr} tone="lg-down" chaos={chaos} reduced={reduced} />
        <Column label="Cr · it bought" value={cr} tone="lg-up" chaos={chaos} reduced={reduced} />

        <div role="status" className="col-span-2 min-h-[4.5rem] lg:col-start-2 lg:col-end-5 lg:min-h-[5.25rem]">
          {pick === null ? (
            <p className="font-mono text-[0.75rem] uppercase tracking-[0.12em] text-(--lg-fg)/45">
              Unposted<span className="animate-blink">_</span>
            </p>
          ) : (
            <motion.div key={pick} initial={reduced ? false : ENTER} animate={SHOWN} transition={{ duration: 0.45, ease: BEZIER.out }}>
              <p className="max-w-[60ch] text-[1rem] leading-snug text-(--lg-fg)/80">
                <span className="font-mono text-[0.75rem] uppercase tracking-[0.1em] text-(--lg-fg)/55">Being · </span>
                {d.options[pick].note}
              </p>
              {isShipped ? (
                <p className="mt-3 max-w-[40ch] font-serif text-[1.45rem] italic leading-[1.1] md:text-[1.7rem]">“{d.why}”</p>
              ) : (
                <p className="mt-3 text-[0.9375rem] text-(--lg-fg)/60">
                  I posted “{d.options[d.chosen].label}” instead. Post it to read why.
                </p>
              )}
            </motion.div>
          )}
        </div>
      </fieldset>

      {pick !== null && (
        <motion.span
          key={`${pick}`}
          aria-hidden
          className="pointer-events-none absolute right-0 top-7 origin-center text-[1rem] lg:top-auto lg:bottom-8 lg:text-[1.35rem]"
          initial={reduced ? false : { scale: 2.4, opacity: 0, rotate: -22 }}
          animate={{ scale: 1, opacity: 1, rotate: isShipped ? -7 : 5 }}
          transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 620, damping: 22 }}
          onAnimationStart={() => !reduced && play("drop")}
        >
          <Stamp tone={isShipped ? "approved" : "declined"} label={isShipped ? "Posted" : "Not posted"} sub={v?.date} />
        </motion.span>
      )}
    </li>
  );
}

function Column({
  label,
  value,
  tone,
  chaos,
  reduced,
}: {
  label: string;
  value: string | null;
  tone: string;
  chaos: boolean;
  reduced: boolean;
}) {
  return (
    <p className="min-w-0 lg:text-right">
      <span className="block font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--lg-fg)/55 lg:sr-only">{label}</span>
      {value ? (
        <motion.span
          key={value}
          initial={reduced ? false : ENTER}
          animate={SHOWN}
          transition={{ duration: 0.5, ease: BEZIER.out }}
          className={cn("mt-1 block font-mono text-[1rem] font-medium leading-snug tabular-nums lg:mt-0 lg:pt-1.5 lg:text-[1.0625rem]", tone, chaos && "lg-jitter")}
        >
          {value}
        </motion.span>
      ) : (
        <span className="mt-1 block font-mono text-[1rem] text-(--lg-fg)/25 lg:mt-0 lg:pt-1.5">· · · · ·</span>
      )}
    </p>
  );
}
