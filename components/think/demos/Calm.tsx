"use client";
import { useState, type CSSProperties } from "react";
import { Check } from "lucide-react";
import { useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { emit } from "@/lib/system";
import { cn, seeded } from "@/lib/utils";
import { micro, useThrownOn, type DemoProps } from "./shared";

const STICKERS = [
  { label: "NEW!", tone: "bg-lime", x: 58, y: 7, r: -8 },
  { label: "!!!", tone: "bg-signal", x: 4, y: 64, r: 9 },
  { label: "LIVE", tone: "bg-ink text-paper", x: 80, y: 46, r: 6 },
  { label: "★ 4.9", tone: "bg-paper ring-1 ring-ink/30", x: 36, y: 70, r: -5 },
  { label: "FREE!", tone: "bg-lime", x: 82, y: 12, r: 13 },
  { label: "HOT", tone: "bg-signal", x: 30, y: 4, r: -14 },
];

/** where the n-th SHIPPED stamp lands on the pile (seeded: same on server and client) */
const pile = (n: number) => ({ x: 8 + seeded(n * 17 + 3) * 52, y: 10 + seeded(n * 29 + 5) * 52, r: (seeded(n * 41 + 7) - 0.5) * 34 });

/**
 * CALM, THEN A SURPRISE — one quiet order screen. Rule on: everything is still, so the single
 * SHIPPED moment lands — once — hard enough to shake the board. Rule off: the screen is already
 * shouting, so the same moment is one more sticker on the pile.
 */
export function CalmDemo({ on, onSurprise }: DemoProps) {
  const [spent, setSpent] = useState(false);
  const [stamps, setStamps] = useState(0);
  const reduced = useReducedMotion();

  // a fresh calm screen every time the rule is thrown on: the surprise is armed again
  useThrownOn(on, () => setSpent(false), 0);

  const ship = () => {
    if (!on) {
      play("click");
      setStamps((n) => Math.min(n + 1, 8));
      return;
    }
    if (spent) return;
    setSpent(true);
    play("drop");
    window.setTimeout(() => play("success"), 160);
    onSurprise?.();
    emit("toast", { text: "ORDER 0412 SHIPPED" });
  };

  return (
    <div role="group" aria-label="Demo: an order screen with one surprise" className="tk-calm relative h-full overflow-hidden" data-on={on ? "1" : "0"}>
      <div className="flex h-full flex-col justify-between px-[clamp(1rem,6cqw,2.25rem)] py-5">
        <p className={cn(micro, on ? "text-smoke" : "text-[#b23a0a]")}>{on ? "Order 0412" : "ORDER 0412 — UPDATE!!"}</p>
        <p className={cn("max-w-[19ch] font-display leading-[1.02] tracking-[-0.025em]", on ? "text-[1.6rem] font-[650]" : "text-[1.45rem] font-[860] uppercase")}>
          {on ? "Packed. It leaves the kitchen at 19:05." : "Packed!!! Leaving 19:05!!! Don't miss it!!!"}
        </p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={ship}
            aria-disabled={on && spent}
            data-cursor="hover"
            className={cn(
              "hit relative z-[2] inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[0.875rem] font-semibold transition-colors",
              on ? "bg-ink text-paper aria-disabled:bg-ink/10 aria-disabled:text-ink" : "tk-loud bg-signal text-ink",
            )}
          >
            {on && spent && <Check aria-hidden size={15} />}
            {on && spent ? "Shipped" : "Ship it"}
          </button>
          {on && spent && <p className={cn(micro, "tk-pop normal-case tracking-[0.04em] text-smoke")}>That was the surprise. There is only one.</p>}
        </div>
      </div>

      {/* the noise — it falls off the screen when the rule comes on */}
      {STICKERS.map((s, i) => (
        <span
          key={s.label}
          aria-hidden
          className={cn("tk-sticker absolute rounded-[4px] px-2 py-1 font-display text-[0.8125rem] font-[860] shadow-[0_4px_10px_-4px_rgb(0_0_0/0.35)]", s.tone)}
          style={{ left: `${s.x}%`, top: `${s.y}%`, rotate: `${s.r}deg`, "--i": i } as CSSProperties}
        >
          {s.label}
        </span>
      ))}
      {Array.from({ length: stamps }, (_, n) => {
        const p = pile(n);
        return (
          <span
            key={`stamp-${n}`}
            aria-hidden
            className="tk-sticker absolute border-2 border-[#d2400d] px-2 py-0.5 font-display text-[1rem] font-[860] uppercase text-[#d2400d]"
            style={{ left: `${p.x}%`, top: `${p.y}%`, rotate: `${p.r}deg`, "--i": n } as CSSProperties}
          >
            <span className={reduced ? undefined : "tk-stamp block"}>Shipped</span>
          </span>
        );
      })}

      {/* the one moment */}
      {on && spent && (
        <>
          {!reduced && <span aria-hidden className="tk-ring" />}
          <span aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className={cn("block -rotate-[8deg] border-[3px] border-[#d2400d] px-4 py-1.5 font-display text-[clamp(2.2rem,13cqw,3.6rem)] font-[860] uppercase leading-none tracking-[-0.02em] text-[#d2400d] mix-blend-multiply", !reduced && "tk-stamp")}>
              Shipped
            </span>
          </span>
        </>
      )}
    </div>
  );
}
