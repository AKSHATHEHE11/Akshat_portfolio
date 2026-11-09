"use client";
// A product in the grid: the flat on a fabric-toned ground, colour chips that re-dye it in place,
// and (on mouse devices) a quick-add size row that tosses the piece straight into the bag.
import Image from "next/image";
import { useRef } from "react";
import { Plus } from "lucide-react";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { Garment } from "../Garment";
import type { Product } from "../scene";
import { useStore } from "./context";

export function ProductTile({ product: p }: { product: Product }) {
  const { colourOf, dispatch, openQuick, add, money } = useStore();
  const c = colourOf(p.id);
  const colour = p.colours[c] ?? p.colours[0];
  const art = useRef<HTMLDivElement>(null);

  return (
    <article className="group/tile relative flex h-full flex-col">
      <div className="relative">
        <button
          type="button"
          onClick={() => openQuick(p.id)}
          onPointerEnter={() => play("tick")}
          data-cursor="view"
          data-cursor-label="VIEW"
          aria-label={`Quick view: ${p.name}, ${colour.name}, ${money(p.price)}`}
          className="relative block aspect-[4/5] w-full overflow-hidden bg-[#e3dfd5]"
        >
          <span aria-hidden className="absolute inset-x-[18%] bottom-[7%] h-[8%] rounded-[50%] bg-black/15 blur-xl" />
          {p.badge ? (
            <span className="absolute left-2.5 top-2.5 z-[1] rounded-[2px] bg-(--fy-fg) px-1.5 py-1 font-mono text-[0.6875rem] uppercase leading-none tracking-[0.1em] text-(--fy-paper)">
              {p.badge}
            </span>
          ) : null}
          <div
            ref={art}
            data-chaos-drift
            className="absolute inset-[9%] transition-transform duration-700 ease-out-expo group-hover/tile:-rotate-2 group-hover/tile:scale-[1.04]"
          >
            {p.image ? (
              <Image src={p.image} alt="" fill sizes="(min-width: 1024px) 22vw, 45vw" className="object-contain" />
            ) : (
              <Garment kind={p.kind} colour={colour.hex} leg={p.leg} pocket={p.pocket} className="size-full drop-shadow-[0_14px_14px_rgb(20_22_28/0.22)]" />
            )}
          </div>
        </button>

        {/* quick add (mouse): pick a size, it flies to the bag */}
        <div className="absolute inset-x-2 bottom-2 hidden translate-y-2 rounded-[4px] bg-(--fy-paper)/95 p-2 opacity-0 shadow-[0_10px_24px_-14px_rgb(0_0_0/0.6)] backdrop-blur-sm transition duration-300 ease-out-expo group-focus-within/tile:translate-y-0 group-focus-within/tile:opacity-100 group-hover/tile:translate-y-0 group-hover/tile:opacity-100 fine:block">
          <p className="mb-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-(--fy-muted)">Quick add — size</p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(1.9rem,1fr))] gap-1">
            {p.sizes.map((s) => (
              <button
                key={s.label}
                type="button"
                disabled={!s.stock}
                onClick={() => add(p, c, s.label, art.current)}
                data-cursor={s.stock ? "hover" : undefined}
                aria-label={s.stock ? `Add ${p.name}, ${colour.name}, size ${s.label} to bag` : `${p.name} size ${s.label}: sold out`}
                className="h-7 rounded-[3px] border border-(--fy-fg)/20 font-mono text-[0.6875rem] tabular-nums transition-colors hover:border-(--fy-fg) hover:bg-(--fy-fg) hover:text-(--fy-paper) disabled:cursor-not-allowed disabled:text-(--fy-fg)/35 disabled:line-through disabled:hover:border-(--fy-fg)/20 disabled:hover:bg-transparent"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* touch: the plus opens the quick view (sizes need a deliberate choice) */}
        <button
          type="button"
          onClick={() => openQuick(p.id)}
          aria-label={`Choose a size for ${p.name}`}
          className="absolute bottom-2 right-2 grid size-11 place-items-center rounded-full bg-(--fy-fg) text-(--fy-paper) fine:hidden"
        >
          <Plus size={16} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3 lg:p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[0.9375rem] font-semibold leading-tight">{p.name}</h3>
          <span className="shrink-0 font-mono text-[0.8125rem] tabular-nums">{money(p.price)}</span>
        </div>
        <p className="text-[0.8125rem] leading-snug text-(--fy-muted)">
          {colour.name} · {p.fabric.oz} oz · {p.fabric.stretch ? `${p.fabric.stretch}% stretch` : "rigid"}
        </p>
        {/* touch: each 20px dot sits in a 44px target (the row shifts left so the first dot still aligns) */}
        <fieldset className="mt-auto flex gap-1.5 pt-1 coarse:-mb-2 coarse:-ml-3 coarse:gap-0 coarse:pt-0">
          <legend className="sr-only">{p.name} colour</legend>
          {p.colours.map((col, i) => (
            <label key={col.name} className="relative cursor-pointer coarse:grid coarse:size-11 coarse:place-items-center" title={col.name} data-cursor="hover">
              <input
                type="radio"
                name={`fy-tile-${p.id}`}
                className="peer sr-only"
                checked={i === c}
                onChange={() => {
                  play("click");
                  dispatch({ type: "colour", id: p.id, colour: i });
                }}
              />
              <span className="sr-only">{col.name}</span>
              <span
                aria-hidden
                className={cn(
                  "block size-5 rounded-full border border-(--fy-fg)/25 transition-transform duration-200 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--signal)",
                  i === c ? "scale-110 ring-2 ring-(--fy-fg) ring-offset-2 ring-offset-(--fy-paper)" : "hover:scale-110",
                )}
                style={{ background: col.hex }}
              />
            </label>
          ))}
        </fieldset>
      </div>
    </article>
  );
}
