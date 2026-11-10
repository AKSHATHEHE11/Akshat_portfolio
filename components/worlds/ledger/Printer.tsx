"use client";
// The receipt printer. The statement feeds up out of the slot one line at a time (the paper rises —
// it never resizes), and the classifier sticks a category flag on each line as it clears the slot,
// highlighting the token it keyed on. FEED skips to the end while printing, and reprints once done.
// The window is always as tall as a full statement, so nothing below moves when one starts.
import { useRef, type CSSProperties, type Ref } from "react";
import { FastForward, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { gsap, useGSAP } from "@/lib/gsap";
import { play } from "@/lib/sound";
import { cn, seeded } from "@/lib/utils";
import type { Borrower, Txn } from "./scene";

const amount = (v: number) => Math.abs(Math.round(v)).toLocaleString("en-IN");

/** Long narrations start a few characters before the token the classifier keyed on, so it stays in view. */
function Narration({ t }: { t: Txn }) {
  const k = t.hit ? t.narration.indexOf(t.hit) : -1;
  if (!t.hit || k < 0) return <>{t.narration}</>;
  const from = k > 14 ? k - 5 : 0;
  return (
    <>
      {from > 0 && "…"}
      {t.narration.slice(from, k)}
      <span className="lg-hit">
        <i data-mark aria-hidden />
        {t.hit}
      </span>
      {t.narration.slice(k + t.hit.length)}
    </>
  );
}

interface Props {
  /** the file being scored; null before the first pick (the window still keeps its height) */
  borrower: Borrower | null;
  /** sizes the empty window before the first pick */
  sizer: Borrower;
  /** bumps on every new print */
  run: number;
  printed: boolean;
  reduced: boolean;
  chaos: boolean;
  slotRef?: Ref<HTMLDivElement>;
  onDone: () => void;
  onReprint: () => void;
}

export function Printer({ borrower, sizer, run, printed, reduced, chaos, slotRef, onDone, onReprint }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const b = borrower ?? sizer;
  const printing = !!borrower && !printed;

  useGSAP(
    () => {
      const paper = root.current?.querySelector<HTMLElement>("[data-paper]");
      if (!borrower || !paper) return;
      if (reduced) return void onDone();
      const rows = gsap.utils.toArray<HTMLElement>("[data-row]", paper);
      const H = paper.offsetHeight; // measured once per print, never per frame
      const pace = chaos ? 0.45 : 1;
      gsap.set(paper, { y: H });
      gsap.set(paper.querySelectorAll("[data-flag]"), { autoAlpha: 0 });
      gsap.set(paper.querySelectorAll("[data-mark]"), { scaleX: 0 });
      const t = gsap.timeline({ onComplete: onDone });
      let at = 0.3;
      rows.forEach((row) => {
        t.to(paper, { y: H - row.offsetTop - row.offsetHeight, duration: 0.07, ease: "power2.out", onStart: () => play("type") }, at);
        const flag = row.querySelector<HTMLElement>("[data-flag]");
        const mark = row.querySelector("[data-mark]");
        if (mark) t.to(mark, { scaleX: 1, duration: 0.26, ease: "power2.out" }, at + 0.26 * pace);
        if (flag) {
          // GSAP takes over the CSS `rotate`, so it lands on the flag's own hand-stuck tilt, not 0
          const tilt = Number(flag.dataset.tilt) || 0;
          t.fromTo(
            flag,
            { autoAlpha: 0, x: -18, rotate: tilt - 12 },
            { autoAlpha: 1, x: 0, rotate: tilt, duration: 0.42, ease: "back.out(2.4)", onStart: () => play("tick") },
            at + 0.32 * pace,
          );
        }
        at += (row.dataset.row === "txn" ? 0.17 : 0.075) * pace;
      });
      t.to(paper, { y: 0, duration: 0.3, ease: "power2.out" }, at + 0.1);
      tl.current = t;
      return () => {
        tl.current = null;
      };
    },
    { scope: root, dependencies: [run, reduced], revertOnUpdate: true },
  );

  const feed = () => {
    const t = tl.current;
    if (t?.isActive()) t.progress(1);
    else onReprint();
  };

  return (
    <div ref={root} className="relative [--lg-flags:5.5rem] [--lg-row:1.375rem] sm:[--lg-flags:6rem] sm:[--lg-row:1.5rem]">
      <div className="relative overflow-hidden pl-2.5 pr-(--lg-flags)">
        {!borrower && (
          <p className="absolute inset-x-0 bottom-6 z-[1] px-6 text-center font-mono text-[0.75rem] uppercase leading-relaxed tracking-[0.12em] text-(--lg-fg)/55">
            Pick a file. Its statement prints here<span className="animate-blink">_</span>
          </p>
        )}
        <div
          key={run}
          data-paper
          aria-hidden={!borrower}
          className="relative isolate px-3 pb-2 pt-4 font-mono text-[0.6875rem] text-[#1f1d19] will-change-transform sm:text-[0.75rem]"
          style={borrower ? undefined : { transform: "translateY(100%)" }}
        >
          {/* the paper is a masked backing layer, so the flags can stick out past its edge */}
          <span aria-hidden className="lg-paper lg-torn absolute inset-0 -z-10" />
          <Head b={b} />
          {b.txns.map((t, i) => {
            const tilt = ((seeded(i * 7 + b.id.length * 31) - 0.5) * 6).toFixed(1);
            return (
              <div key={i} data-row="txn" className="lg-row relative grid grid-cols-[2.75rem_minmax(0,1fr)_auto] gap-x-2 sm:grid-cols-[3.1rem_minmax(0,1fr)_auto]">
                <span>{t.date}</span>
                <span className="truncate">
                  <Narration t={t} />
                </span>
                <span className={cn("tabular-nums", t.amount < 0 && "lg-red")}>
                  {amount(t.amount)}
                  <span className="ml-1 text-[0.85em] opacity-70">{t.amount < 0 ? "DR" : "CR"}</span>
                </span>
                <span
                  data-flag
                  data-kind={t.kind}
                  data-tilt={tilt}
                  className="lg-flag absolute top-[3px]"
                  style={{ left: "calc(100% + 0.75rem - 3px)", rotate: `${tilt}deg`, "--lg-delay": `${-i * 0.07}s` } as CSSProperties}
                >
                  {t.tag}
                  <b className="max-sm:hidden">.{Math.round(t.conf * 100)}</b>
                </span>
              </div>
            );
          })}
          <div data-row="foot" className="lg-row lg-dash" />
          <div data-row="foot" className="lg-row flex justify-between gap-3">
            <span>
              {b.txns.length} OF {b.bank.lines.toLocaleString("en-IN")} LINES
            </span>
            <span>{b.profile.months} MONTHS</span>
          </div>
          <div data-row="foot" className="lg-row flex justify-between gap-3">
            <span>AVG INFLOW / MONTH</span>
            <span className="tabular-nums">{amount(b.profile.income)}</span>
          </div>
          <div data-row="foot" className="lg-row text-center tracking-[0.3em] opacity-55">
            · · TEAR HERE · ·
          </div>
        </div>
      </div>

      {/* the machine: tear bar, slot, label, status LED, FEED key */}
      <div className="lg-housing relative z-[2] mr-[calc(var(--lg-flags)-0.625rem)] rounded-b-[16px] rounded-t-[6px] px-3 pb-3">
        <div aria-hidden className="lg-teeth mx-1.5 h-1" />
        <div ref={slotRef} aria-hidden className="lg-slot mx-0.5 h-2 rounded-full" />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="flex min-w-0 items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-(--lg-fg)/65">
            <span aria-hidden className="lg-led size-2 shrink-0 rounded-full" data-on={borrower ? "" : undefined} data-blink={printing ? "" : undefined} />
            <span className="truncate">CW-80 thermal</span>
          </p>
          <Button
            variant="key"
            size="sm"
            magnetic={false}
            disabled={!borrower}
            onClick={feed}
            aria-label={printing ? "Feed: skip to the end of the statement" : "Feed: print the statement again"}
            icon={printing ? <FastForward size={13} strokeWidth={2} /> : <RotateCcw size={13} strokeWidth={2} />}
            className="shrink-0 disabled:opacity-40"
          >
            Feed
          </Button>
        </div>
      </div>
    </div>
  );
}

function Head({ b }: { b: Borrower }) {
  return (
    <>
      <div data-row="head" className="lg-row truncate text-center font-semibold tracking-[0.08em]">
        {b.bank.name.toUpperCase()} · {b.bank.branch.toUpperCase()}
      </div>
      <div data-row="head" className="lg-row truncate text-center">
        STATEMENT OF ACCOUNT {b.bank.account}
      </div>
      <div data-row="head" className="lg-row truncate text-center">
        {b.name.toUpperCase()} · {b.bank.period.toUpperCase()}
      </div>
      <div data-row="head" className="lg-row lg-dash" />
      <div data-row="head" className="lg-row grid grid-cols-[2.75rem_minmax(0,1fr)_auto] gap-x-2 font-semibold sm:grid-cols-[3.1rem_minmax(0,1fr)_auto]">
        <span>DATE</span>
        <span>NARRATION</span>
        <span>AMOUNT</span>
      </div>
    </>
  );
}
