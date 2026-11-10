"use client";
import { useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { liveness, micro, useThrownOn, type DemoProps } from "./shared";

type Spot = "badge" | "aside" | "meta" | "price" | "cta" | "pop";
interface Junk {
  id: string;
  label: string;
  spot: Spot;
}

const START: Junk[] = [
  { id: "sale", label: "SALE!!", spot: "badge" },
  { id: "left", label: "Only 2 left!", spot: "badge" },
  { id: "share", label: "Share", spot: "aside" },
  { id: "save", label: "♡ Save", spot: "aside" },
  { id: "stars", label: "★★★★☆ 2,341", spot: "meta" },
  { id: "compare", label: "Compare", spot: "meta" },
  { id: "was", label: "₹7,490", spot: "price" },
  { id: "timer", label: "Ends 02:14:09", spot: "price" },
  { id: "buy", label: "Buy now", spot: "cta" },
  { id: "chat", label: "Chat", spot: "cta" },
  { id: "pop", label: "Join the list, get 10% off", spot: "pop" },
];
/** what "fixing" adds while the rule is off */
const MORE = ["NEW", "TRENDING", "FREE SHIPPING*", "BESTSELLER", "AS SEEN ON INSTA", "LIMITED DROP"];
const ESSENTIALS = 3; // name, price, Add to bag

const look: Record<Spot, string> = {
  badge: "rounded-[3px] bg-signal px-1.5 py-1 font-mono text-[0.6875rem] font-semibold tracking-[0.04em] text-ink",
  aside: "rounded-full border border-ink/25 px-2 py-1 text-[0.6875rem]",
  meta: "text-[0.75rem] text-smoke underline decoration-ink/25 underline-offset-2",
  price: "text-[0.75rem] font-medium text-[#b23a0a]",
  cta: "rounded-full border border-ink/30 px-3 py-1.5 text-[0.75rem] font-semibold",
  pop: "w-full justify-between gap-3 whitespace-normal rounded-[6px] bg-ink px-3 py-2.5 text-left text-[0.75rem] leading-snug text-paper shadow-[0_10px_24px_-8px_rgb(0_0_0/0.5)]",
};

/**
 * DELETE BEFORE YOU ADD — a product page buried under features. Rule on: tap any of the noise to
 * delete it and watch clarity climb. Rule off: every "fix" ships another feature instead.
 */
export function DeleteDemo({ on, quiet }: DemoProps) {
  const [junk, setJunk] = useState(START);
  const [going, setGoing] = useState<string[]>([]);
  // features shipped while the rule is off. A ref, not state: two fixes landing before React
  // re-renders must still get two different badges (state read here would be one render stale).
  const shipped = useRef(0);
  const [note, setNote] = useState("");
  const [bagged, setBagged] = useState(false);
  const reduced = useReducedMotion();

  const remove = (id: string) => {
    if (going.includes(id)) return;
    play("click");
    setGoing((g) => [...g, id]);
    window.setTimeout(
      () => {
        setJunk((j) => j.filter((x) => x.id !== id));
        setGoing((g) => g.filter((x) => x !== id));
      },
      reduced ? 0 : 240,
    );
  };

  const hit = (id: string) => {
    if (on) return remove(id);
    const k = shipped.current;
    if (k >= MORE.length) {
      play("error");
      setNote("Feature freeze. Too late.");
      return;
    }
    shipped.current = k + 1;
    play("press");
    setJunk((j) => [...j, { id: `more-${k}`, label: MORE[k], spot: "badge" }]);
    setNote("That fix shipped as a feature.");
  };

  useThrownOn(on, () => {
    setNote("");
    if (junk.some((j) => j.id === "pop")) remove("pop");
  });

  const clarity = Math.round((ESSENTIALS / (ESSENTIALS + junk.length)) * 100);
  const clean = junk.length === 0;
  const at = (spot: Spot) =>
    junk
      .filter((j) => j.spot === spot)
      .map((j) => (
        <button
          key={j.id}
          type="button"
          aria-label={on ? `Delete “${j.label}”` : `${j.label}. Rule off: fixing it adds a feature`}
          data-cursor="hover"
          data-cursor-label={on ? "DELETE" : "FIX"}
          onClick={() => hit(j.id)}
          className={cn(
            "hit tk-pop inline-flex items-center gap-1 whitespace-nowrap leading-none transition-[box-shadow,background-color] duration-150",
            on && "hover:shadow-[0_0_0_2px_#ff5a1f] focus-visible:shadow-[0_0_0_2px_#ff5a1f]",
            look[spot],
            going.includes(j.id) && "tk-gone",
          )}
        >
          {spot === "pop" ? (
            <>
              <span>{j.label}</span>
              <X aria-hidden size={13} />
            </>
          ) : (
            j.label
          )}
        </button>
      ));

  return (
    <div role="group" aria-label="Demo: a cluttered product page" className="flex h-full flex-col px-[clamp(0.75rem,4cqw,1.4rem)] py-3">
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <div className="flex items-start justify-between gap-1.5">
          {/* touch: wrapped badge rows sit 14px apart so a badge's 44px hit area never covers the one above */}
          <div className="flex flex-wrap gap-1 coarse:gap-y-3.5">{at("badge")}</div>
          <div className="flex shrink-0 gap-1">{at("aside")}</div>
        </div>
        {/* the product itself takes whatever room the features leave it: every "fix" squeezes it */}
        <div aria-hidden className="tk-denim min-h-0 flex-1 rounded-[4px]" />
        <p className="font-display text-[1.2rem] font-[780] leading-[1.05] tracking-[-0.02em]">Selvedge denim, 14 oz</p>
        {junk.some((j) => j.spot === "meta") && <div className="flex flex-wrap items-center gap-x-3 gap-y-1">{at("meta")}</div>}
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="font-display text-[1.35rem] font-[800] tracking-[-0.02em]">₹4,990</span>
          {at("price")}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              play(bagged ? "click" : "success");
              setBagged((b) => !b);
            }}
            data-cursor="hover"
            className="hit inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-[0.75rem] font-semibold text-paper"
          >
            {bagged && <Check aria-hidden size={13} />}
            {bagged ? "In your bag" : "Add to bag"}
          </button>
          {at("cta")}
        </div>
      </div>

      {junk.some((j) => j.spot === "pop") && (
        <div className="absolute bottom-11 right-3 w-[min(15rem,70%)]">{at("pop")}</div>
      )}

      <div aria-live={liveness(quiet)} aria-atomic className="mt-2.5 flex items-center gap-3 border-t border-ink/15 pt-2.5">
        <span className={cn(micro, "shrink-0")}>Clarity</span>
        <span aria-hidden className="flex flex-1 gap-[3px]">
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className={cn("h-2 flex-1 rounded-[1px]", i < Math.round(clarity / 10) ? "bg-signal" : "bg-ink/12")} />
          ))}
        </span>
        <span className={cn(micro, "w-[4ch] text-right tabular-nums")}>{clarity}%</span>
      </div>
      {/* the reset may wrap (it is the one action left on a clean page); hints stay on one line */}
      <p aria-live={liveness(quiet)} className={cn(micro, "mt-2 min-h-[0.7rem] normal-case tracking-[0.04em] text-smoke", !clean && "truncate")}>
        {clean ? (
          <button
            type="button"
            data-cursor="hover"
            className="hit text-left uppercase leading-[1.3] tracking-[0.12em] text-ink underline underline-offset-2"
            onClick={() => {
              play("open");
              setJunk(START);
              shipped.current = 0;
            }}
          >
            Nothing left to delete. Put it all back
          </button>
        ) : (
          note || (on ? "Tap the noise to delete it" : "Rule off: try fixing something")
        )}
      </p>
    </div>
  );
}
