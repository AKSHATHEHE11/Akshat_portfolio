"use client";
// The applicant files on the desk. Picking one pulls it out of the drawer and feeds its statement
// to the printer. Phones: a 2×2 grid; tablets: one row; desktop: the drawer, stacked.
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { rupees } from "./engine";
import type { Borrower } from "./scene";

export function Files({ borrowers, active, onPick }: { borrowers: Borrower[]; active: number | null; onPick: (i: number) => void }) {
  return (
    <div role="group" aria-label="Applicant files" className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-1 xl:gap-2.5">
      {borrowers.map((b, i) => {
        const on = active === i;
        return (
          <button
            key={b.id}
            type="button"
            aria-pressed={on}
            aria-label={`${b.name}, ${b.occupation}, ${b.city}. ${b.profile.months} months of statements. Asks ${rupees(b.ask.amount)} over ${b.ask.months} months.`}
            onClick={() => onPick(i)}
            onPointerEnter={() => play("tick")}
            data-cursor="hover"
            data-cursor-label={on ? "REPRINT" : "SCORE"}
            className={cn(
              "group relative min-w-0 rounded-[6px] border px-3 py-3 text-left transition-[translate,border-color] duration-300 ease-out-expo xl:px-4",
              on
                ? "lg-paper border-transparent shadow-[0_14px_24px_-16px_rgb(0_0_0/0.9)] xl:translate-x-3"
                : "border-(--lg-fg)/14 text-(--lg-fg) hover:border-(--lg-fg)/40 hover:bg-(--lg-fg)/[0.04]",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute inset-y-3 left-0 w-[3px] rounded-r-[2px] transition-colors duration-300",
                on ? "bg-(--lg-signal)" : "bg-(--lg-fg)/20 group-hover:bg-(--lg-fg)/45",
              )}
            />
            <span aria-hidden className="flex items-center justify-between gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.1em] opacity-70">
              <span className="truncate">{b.file}</span>
              <span className="shrink-0">{b.profile.months} mo</span>
            </span>
            <span aria-hidden className="mt-2 block truncate font-display text-[1.15rem] font-[720] leading-none tracking-[-0.01em] md:text-[1.25rem]">
              {b.name}
            </span>
            <span aria-hidden className="mt-1.5 block text-[0.8125rem] leading-snug opacity-75">
              <span className="max-md:line-clamp-1">{b.occupation}</span>
              <span className="max-md:hidden"> · {b.city}</span>
            </span>
            <span aria-hidden className="mt-3 hidden font-mono text-[0.75rem] xl:block">
              Asks {rupees(b.ask.amount)} · {b.ask.months} mo
            </span>
            <span aria-hidden className="mt-1 hidden text-[0.8125rem] leading-snug opacity-65 xl:block">
              {b.bureau}
            </span>
          </button>
        );
      })}
    </div>
  );
}
