"use client";
// The bag. Docked top-right under the nav while the store is on screen, and anywhere in the world
// once something is in it — so pieces bagged from the cover or the lookbook have somewhere to land.
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ShoppingBag } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { BEZIER } from "@/lib/motion";
import { play } from "@/lib/sound";
import { useStore } from "./context";

export function BagButton() {
  const { count, subtotal, money, bagRef, dispatch, state } = useStore();
  const [storeInView, setStoreInView] = useState(false);
  const [pastEnd, setPastEnd] = useState(false);
  const bump = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = document.getElementById("preview");
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setStoreInView(e.isIntersecting), { rootMargin: "-15% 0px -15% 0px" });
    io.observe(el);
    // past the end of the world (the shell's finale) the bag tucks away
    const end = document.getElementById("fy-end");
    const io2 = new IntersectionObserver(([e]) => setPastEnd(e.isIntersecting || e.boundingClientRect.top < 0));
    if (end) io2.observe(end);
    return () => {
      io.disconnect();
      io2.disconnect();
    };
  }, []);

  useGSAP(
    () => {
      if (!state.landed || !bump.current) return;
      gsap.fromTo(bump.current, { scale: 1.22, rotation: -8 }, { scale: 1, rotation: 0, duration: 0.8, ease: "elastic.out(1, 0.38)" });
    },
    { dependencies: [state.landed] },
  );

  const show = (count > 0 && !pastEnd) || storeInView || state.bagOpen;

  return (
    <AnimatePresence>
      {show ? (
        <motion.button
          key="bag"
          ref={bagRef}
          type="button"
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.45, ease: BEZIER.out }}
          onClick={() => {
            play("open");
            dispatch({ type: "bag", open: true });
          }}
          onPointerEnter={() => play("tick")}
          aria-label={`Bag: ${count} ${count === 1 ? "piece" : "pieces"}, ${money(subtotal)}`}
          data-cursor="hover"
          className="fixed right-[calc(var(--margin)+0.5rem)] top-[calc(var(--nav-h)+0.5rem)] z-[40] flex h-11 items-center gap-2.5 rounded-full bg-(--fy-fg) pl-3.5 pr-2 text-(--fy-paper) shadow-[0_12px_28px_-14px_rgb(0_0_0/0.7)] transition-[translate] duration-150 active:translate-y-[2px]"
        >
          <span ref={bump} className="flex items-center gap-2">
            <ShoppingBag size={17} strokeWidth={1.75} aria-hidden />
            <span className="text-[0.875rem] font-semibold">Bag</span>
          </span>
          <span className="hidden font-mono text-[0.75rem] tabular-nums opacity-80 sm:inline">{money(subtotal)}</span>
          <span className="grid h-7 min-w-7 place-items-center rounded-full bg-(--fy-accent) px-1.5 font-mono text-[0.75rem] font-semibold tabular-nums text-(--fy-fg)">
            {count}
          </span>
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
