"use client";
// The interactive preview: the actual Fybr8 storefront, working end to end with the scene's stock.
// Shop (filters → grid → quick view → bag → three-tap checkout) and Fit finder live under one header.
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Ruler } from "lucide-react";
import { SPRING } from "@/lib/motion";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { Garment } from "../Garment";
import type { Product } from "../scene";
import { useStore, type Filter, type Tab } from "./context";
import { FitFinder } from "./FitFinder";
import { ProductTile } from "./ProductTile";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "jackets", label: "Jackets" },
  { id: "tees", label: "Tees" },
  { id: "denim", label: "Denim" },
];
const TABS: { id: Tab; label: string }[] = [
  { id: "shop", label: "Shop" },
  { id: "fit", label: "Fit finder" },
];

export function Store({ title }: { title: string }) {
  const { scene, state, dispatch, go } = useStore();
  const { products, store } = scene;
  const shown = state.filter === "all" ? products : products.filter((p) => p.category === state.filter);
  // the fit promo follows the second tile: 2×2 on four columns, a full-width band on two, so 8 (all)
  // or 4 (denim) pieces close every row
  const promoAt = state.filter === "all" || state.filter === "denim" ? Math.min(2, shown.length) : -1;
  const fitLine = scene.coverLines.find((l) => l.target === "fit")?.text ?? "Find your fit";
  const pair = products.find((p) => p.fitId);

  const setTab = (tab: Tab) => {
    play("click");
    dispatch({ type: "tab", tab });
  };

  return (
    <section id="preview" aria-labelledby="fy-store" className="relative scroll-mt-[var(--nav-h)] px-(--margin) py-24 lg:py-32">
      <div className="mx-auto max-w-(--frame-max)">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-x-10 gap-y-3">
          <h2 id="fy-store" data-chaos-type className="font-serif text-[clamp(3rem,1.6rem+5vw,7.5rem)] italic leading-[0.82] tracking-[-0.025em]">
            Shop the drop
          </h2>
          <p className="max-w-[34ch] pb-2 font-serif text-[1.35rem] italic leading-tight">
            The store, working. Bag something, check out — nothing ships, nobody is charged.
          </p>
        </div>

        <div className="relative border border-(--fy-fg) bg-(--fy-paper) text-(--fy-fg) shadow-[10px_10px_0_0_var(--fy-fg)] max-sm:shadow-[6px_6px_0_0_var(--fy-fg)]">
          {/* store header */}
          <div className="sticky top-[var(--nav-h)] z-[20] border-b border-(--fy-fg)/15 bg-(--fy-paper)">
            <div className="flex h-14 items-center gap-2 pl-3 pr-28 sm:gap-6 sm:pl-4 sm:pr-48 lg:pl-6">
              <span className="font-serif text-[1.35rem] italic leading-none sm:text-[1.65rem]">{title}</span>
              <div role="tablist" aria-label="Store" className="flex gap-1">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    id={`fy-tab-${t.id}`}
                    role="tab"
                    type="button"
                    aria-selected={state.tab === t.id}
                    aria-controls={`fy-panel-${t.id}`}
                    onClick={() => setTab(t.id)}
                    onKeyDown={(e) => {
                      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
                      e.preventDefault();
                      e.stopPropagation();
                      const next = TABS[(TABS.findIndex((x) => x.id === state.tab) + 1) % TABS.length].id;
                      setTab(next);
                      document.getElementById(`fy-tab-${next}`)?.focus();
                    }}
                    tabIndex={state.tab === t.id ? 0 : -1}
                    data-cursor="hover"
                    className={cn(
                      "relative h-9 whitespace-nowrap px-2 text-[0.875rem] font-medium transition-colors coarse:h-11 sm:px-3",
                      state.tab === t.id ? "text-(--fy-fg)" : "text-(--fy-fg)/60 hover:text-(--fy-fg)",
                    )}
                  >
                    {t.id === "fit" ? <Ruler size={14} strokeWidth={1.75} aria-hidden className="mr-1.5 hidden -translate-y-px sm:inline" /> : null}
                    {t.label}
                    {state.tab === t.id ? <motion.span layoutId="fy-tab-line" transition={SPRING.soft} className="absolute inset-x-2 -bottom-[11px] h-[2px] bg-(--fy-fg) coarse:-bottom-[7px] sm:inset-x-3" /> : null}
                  </button>
                ))}
              </div>
              <ul className="ml-auto hidden gap-5 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-(--fy-muted) xl:flex">
                {store.perks.map((perk) => (
                  <li key={perk}>{perk}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* shop */}
          <div id="fy-panel-shop" role="tabpanel" aria-labelledby="fy-tab-shop" hidden={state.tab !== "shop"}>
            <div className="flex flex-wrap items-center gap-2 border-b border-(--fy-fg)/15 px-3 py-3 lg:px-5">
              <LayoutGroup id="fy-filters">
                {FILTERS.map((f) => {
                  const on = state.filter === f.id;
                  const n = f.id === "all" ? products.length : products.filter((p) => p.category === f.id).length;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        play("click");
                        dispatch({ type: "filter", filter: f.id });
                      }}
                      onPointerEnter={() => play("tick")}
                      data-cursor="hover"
                      className="relative h-9 rounded-full border border-(--fy-fg)/20 px-4 text-[0.875rem] font-medium coarse:h-11"
                    >
                      {on ? <motion.span layoutId="fy-chip" transition={SPRING.soft} className="absolute -inset-px rounded-full bg-(--fy-fg)" /> : null}
                      <span className={cn("relative transition-colors duration-200", on && "text-(--fy-paper)")}>
                        {f.label}
                        <sup className="ml-1 font-mono text-[0.6875rem] opacity-70">{n}</sup>
                      </span>
                    </button>
                  );
                })}
              </LayoutGroup>
              <span className="ml-auto font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-(--fy-muted)" aria-live="polite">
                {shown.length} {shown.length === 1 ? "piece" : "pieces"}
              </span>
            </div>

            <div className="overflow-clip">
              <ul className="-mb-px -mr-px grid grid-cols-2 lg:grid-cols-4">
              <AnimatePresence mode="popLayout" initial={false}>
                {shown.flatMap((p, i) => {
                  const tile = (
                    <motion.li
                      key={p.id}
                      layout
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.94 }}
                      transition={SPRING.soft}
                      className="border-b border-r border-(--fy-fg)/12 transition-[rotate] duration-700 ease-out-expo chaos:odd:-rotate-[1.5deg] chaos:even:rotate-[2deg]"
                    >
                      <ProductTile product={p} />
                    </motion.li>
                  );
                  return i === promoAt - 1 ? [tile, <FitPromo key="fit-promo" line={fitLine} pair={pair} onOpen={() => go("fit")} />] : [tile];
                })}
              </AnimatePresence>
            </ul>
            </div>
          </div>

          {/* fit finder (kept mounted so measurements survive tab switches) */}
          <div id="fy-panel-fit" role="tabpanel" aria-labelledby="fy-tab-fit" hidden={state.tab !== "fit"}>
            <FitFinder />
          </div>
        </div>
      </div>
    </section>
  );
}

function FitPromo({ line, pair, onOpen }: { line: string; pair?: Product; onOpen: () => void }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={SPRING.soft}
      className="col-span-2 border-b border-r border-(--fy-fg)/12 lg:row-span-2"
    >
      <button
        type="button"
        onClick={onOpen}
        data-cursor="hover"
        className="group/promo relative flex h-full min-h-52 w-full flex-col justify-between overflow-hidden bg-(--fy-accent) p-4 text-left text-(--fy-fg) lg:p-7"
      >
        <span className="max-w-[16ch] font-serif text-[clamp(1.75rem,1.1rem+2vw,2.6rem)] italic leading-[0.95] lg:text-[clamp(2.6rem,0.8rem+3vw,4.6rem)]">{line}.</span>
        {/* desktop: a pair of the house jeans with the tape across its waist — the fit finder in one picture */}
        {pair ? (
          <span aria-hidden className="absolute right-[9%] top-[calc(46%-1.25rem)] hidden w-[44%] rotate-[5deg] transition-[rotate] duration-700 ease-out-expo group-hover/promo:rotate-[2deg] lg:block">
            <Garment kind={pair.kind} colour={pair.colours[0].hex} leg={pair.leg} still className="w-full drop-shadow-[0_24px_20px_rgb(20_22_28/0.3)]" />
          </span>
        ) : null}
        <span aria-hidden className="absolute -inset-x-4 top-[46%] h-9 -rotate-[8deg] border-y border-(--fy-fg) bg-(--fy-accent) transition-[rotate] duration-700 ease-out-expo group-hover/promo:-rotate-[4deg] lg:h-14">
          <span
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(90deg, var(--fy-fg) 1.5px, transparent 1.5px), linear-gradient(90deg, var(--fy-fg) 1px, transparent 1px)",
              backgroundSize: "40px 55%, 10px 28%",
              backgroundRepeat: "repeat-x",
            }}
          />
        </span>
        <span className="relative flex items-center justify-between font-mono text-[0.75rem] uppercase tracking-[0.12em]">
          Open the fit finder
          <span className="transition-transform duration-300 group-hover/promo:translate-x-1">→</span>
        </span>
      </button>
    </motion.li>
  );
}
