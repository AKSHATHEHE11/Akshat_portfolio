"use client";
// Quick view: the product on its own fabric, colour (re-dyes the flat), size, fabric-first modules,
// and add-to-bag — which closes the sheet and throws the piece into the bag.
import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Ruler, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BEZIER } from "@/lib/motion";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { specFor, useFabric } from "../fabric";
import { Garment } from "../Garment";
import { mix } from "../kit";
import type { Product } from "../scene";
import { useStore } from "./context";
import { FabricFirst } from "./Fabric";
import { useDialog } from "./useDialog";

export function QuickView() {
  const { state, product } = useStore();
  const p = state.quick ? product(state.quick.id) : undefined;
  return <AnimatePresence>{p && state.quick ? <Sheet key={p.id} product={p} initialSize={state.quick.size} /> : null}</AnimatePresence>;
}

function Sheet({ product: p, initialSize }: { product: Product; initialSize: string | null }) {
  const { dispatch, colourOf, add, money, scene, go } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const art = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<string | null>(() => (initialSize && p.sizes.some((s) => s.label === initialSize && s.stock > 0) ? initialSize : null));
  const [nudge, setNudge] = useState(0);
  const c = colourOf(p.id);
  const colour = p.colours[c] ?? p.colours[0];
  const backdrop = useFabric(specFor(colour, p.fabric.weave));

  const close = useCallback(() => {
    play("close");
    dispatch({ type: "quick", id: null });
  }, [dispatch]);
  useDialog(true, close, ref);

  const onAdd = () => {
    if (!size) {
      play("error");
      setNudge((n) => n + 1);
      return;
    }
    add(p, c, size, art.current);
    dispatch({ type: "quick", id: null });
  };

  const denim = p.category === "denim";
  const title = `fy-qv-${p.id}`;

  return (
    // data-swipe="local": a sideways swipe on the sheet must not switch worlds underneath it
    <div data-swipe="local" className="fixed inset-0 z-[70] flex items-end justify-center lg:items-center">
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-[#14161c]/55 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={close}
      />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title}
        initial={{ y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 28, opacity: 0 }}
        transition={{ duration: 0.55, ease: BEZIER.out }}
        className="relative grid max-h-[94svh] w-full grid-rows-[minmax(0,36svh)_minmax(0,1fr)] overflow-hidden rounded-t-[12px] bg-(--fy-paper) text-(--fy-fg) shadow-[0_40px_80px_-30px_rgb(0_0_0/0.6)] lg:h-[min(800px,90svh)] lg:w-[min(1120px,94vw)] lg:grid-cols-[1.05fr_1fr] lg:grid-rows-1 lg:rounded-[4px]"
      >
        {/* the garment on its own cloth */}
        <div className="relative overflow-hidden" style={{ backgroundColor: mix(colour.hex, "#e9e6df", 0.82) }}>
          <span
            aria-hidden
            className="absolute inset-0 opacity-[0.16] mix-blend-multiply"
            style={{ backgroundImage: backdrop ? `url(${backdrop})` : undefined, backgroundSize: "128px" }}
          />
          <div ref={art} className="absolute inset-[8%] lg:inset-[11%]">
            {p.image ? (
              <Image src={p.image} alt={`${p.name} in ${colour.name}`} fill sizes="50vw" className="object-contain" />
            ) : (
              <Garment kind={p.kind} colour={colour.hex} leg={p.leg} pocket={p.pocket} label={`${p.name} in ${colour.name}`} className="size-full drop-shadow-[0_24px_22px_rgb(20_22_28/0.28)]" />
            )}
          </div>
          <span className="absolute bottom-3 left-4 font-mono text-[0.6875rem] uppercase tracking-[0.14em]">{colour.name}</span>
          <button
            type="button"
            data-autofocus
            onClick={close}
            aria-label="Close quick view"
            className="absolute right-3 top-3 grid size-11 place-items-center rounded-full bg-(--fy-paper) shadow-[0_6px_16px_-8px_rgb(0_0_0/0.5)] lg:hidden"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        {/* details */}
        <div data-lenis-prevent className="overflow-y-auto overscroll-contain px-5 pb-8 pt-5 lg:px-8 lg:pt-7">
          <div className="flex items-center justify-between gap-4">
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--fy-muted)">
              {p.sku}
              {p.badge ? ` · ${p.badge}` : ""}
            </span>
            <button
              type="button"
              data-autofocus
              onClick={close}
              aria-label="Close quick view"
              data-cursor="hover"
              className="hidden size-11 place-items-center rounded-full border border-(--fy-fg)/20 transition-colors hover:bg-(--fy-fg) hover:text-(--fy-paper) lg:grid"
            >
              <X size={18} aria-hidden />
            </button>
          </div>
          <h2 id={title} className="mt-2 font-serif text-[clamp(2.4rem,1.8rem+2vw,3.6rem)] italic leading-[0.9]">
            {p.name}
          </h2>
          <p className="mt-2 font-mono text-[1.0625rem] tabular-nums">{money(p.price)}</p>
          <p className="mt-3 max-w-[46ch] text-[0.9375rem] leading-relaxed">{p.note}</p>

          <fieldset className="mt-6">
            <legend className="text-[0.875rem] font-semibold">
              Colour <span className="font-normal text-(--fy-muted)">— {colour.name}</span>
            </legend>
            <div className="mt-2 flex gap-2.5">
              {p.colours.map((col, i) => (
                <Chip
                  key={col.name}
                  name={`fy-qv-colour-${p.id}`}
                  label={col.name}
                  checked={i === c}
                  colour={col}
                  product={p}
                  onPick={() => {
                    play("click");
                    dispatch({ type: "colour", id: p.id, colour: i });
                  }}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-6">
            <legend className="text-[0.875rem] font-semibold">Size</legend>
            <motion.div
              key={nudge}
              animate={nudge ? { x: [0, -9, 9, -6, 6, -2, 0] } : undefined}
              transition={{ duration: 0.45 }}
              className={cn("mt-2 grid gap-1.5", denim ? "grid-cols-4 sm:grid-cols-8" : "grid-cols-5")}
            >
              {p.sizes.map((s) => (
                <label key={s.label} data-cursor={s.stock ? "hover" : undefined} className={cn("relative", s.stock ? "cursor-pointer" : "cursor-not-allowed")}>
                  <input
                    type="radio"
                    name={`fy-qv-size-${p.id}`}
                    className="peer sr-only"
                    disabled={!s.stock}
                    checked={size === s.label}
                    onChange={() => {
                      play("click");
                      setSize(s.label);
                    }}
                  />
                  <span
                    className={cn(
                      "grid h-11 place-items-center rounded-[3px] border font-mono text-[0.8125rem] tabular-nums transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--signal)",
                      size === s.label ? "border-(--fy-fg) bg-(--fy-fg) text-(--fy-paper)" : "border-(--fy-fg)/25 hover:border-(--fy-fg)",
                      !s.stock && "border-dashed text-(--fy-fg)/35 line-through hover:border-(--fy-fg)/25",
                    )}
                  >
                    {s.label}
                  </span>
                  {!s.stock ? <span className="sr-only"> (sold out)</span> : s.stock < 3 ? <span className="sr-only"> (last {s.stock})</span> : null}
                  {s.stock > 0 && s.stock < 3 ? (
                    <span aria-hidden className="absolute -right-1 -top-1 size-2 rounded-full bg-[#ff5a1f]" title={`Last ${s.stock}`} />
                  ) : null}
                </label>
              ))}
            </motion.div>
            <div className="mt-2 flex min-h-5 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p role="status" className={cn("text-[0.8125rem]", nudge && !size ? "font-semibold text-(--fy-fg)" : "text-(--fy-muted)")}>
                {nudge && !size ? "Pick a size first." : size ? (p.sizes.find((s) => s.label === size)?.stock ?? 0) < 3 ? "Last few in this size." : "In stock — ships tomorrow." : "Orange dot: last few left."}
              </p>
              {denim ? (
                <button
                  type="button"
                  onClick={() => {
                    close();
                    go("fit");
                  }}
                  data-cursor="hover"
                  className="flex items-center gap-1.5 text-[0.8125rem] underline decoration-1 underline-offset-4 hover:decoration-2 coarse:min-h-11"
                >
                  <Ruler size={14} aria-hidden /> Not sure? Use your own jeans
                </button>
              ) : null}
            </div>
          </fieldset>

          <Button variant="ink" size="lg" onClick={onAdd} className="mt-2 w-full" magnetic={false}>
            {size ? `Add to bag — ${money(p.price)}` : "Add to bag"}
          </Button>
          <p className="mt-3 text-center font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-(--fy-muted)">{scene.store.perks.join(" · ")}</p>

          <section aria-labelledby={`${title}-fabric`} className="mt-9 border-t border-(--fy-fg)/15 pt-6">
            <h3 id={`${title}-fabric`} className="font-serif text-[1.9rem] italic leading-none">
              Fabric first
            </h3>
            <div className="mt-4">
              <FabricFirst product={p} colour={colour} />
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
}

function Chip({
  name,
  label,
  checked,
  colour,
  product,
  onPick,
}: {
  name: string;
  label: string;
  checked: boolean;
  colour: Product["colours"][number];
  product: Product;
  onPick: () => void;
}) {
  const url = useFabric(specFor(colour, product.fabric.weave));
  return (
    <label className="relative cursor-pointer" title={label} data-cursor="hover">
      <input type="radio" name={name} className="peer sr-only" checked={checked} onChange={onPick} />
      <span className="sr-only">{label}</span>
      <span
        aria-hidden
        className={cn(
          "block size-10 rounded-full coarse:size-11 border border-(--fy-fg)/25 transition-transform duration-200 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--signal)",
          checked ? "scale-105 ring-2 ring-(--fy-fg) ring-offset-2 ring-offset-(--fy-paper)" : "hover:scale-110",
        )}
        style={{ backgroundColor: colour.hex, backgroundImage: url ? `url(${url})` : undefined, backgroundSize: "64px" }}
      />
    </label>
  );
}
