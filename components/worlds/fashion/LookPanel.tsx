"use client";
// One look of the lookbook: a flat-lay of real store pieces on a coloured ground, the look number,
// an oversized outlined word, and shoppable credits (each opens the quick view in that colour).
import Image from "next/image";
import type { CSSProperties } from "react";
import { play } from "@/lib/sound";
import { cn, pad } from "@/lib/utils";
import { Garment } from "./Garment";
import { inkOn } from "./kit";
import type { Look } from "./scene";
import { useStore } from "./store/context";

type Slot = { left: number; top: number; w: number; rot: number; depth: number };
/** flat-lay positions (% of the stage) by number of pieces; slides are narrower, so pieces are bigger */
const SLOTS: Record<"wide" | "slide", Record<number, Slot[]>> = {
  wide: {
    3: [
      { left: 6, top: 4, w: 44, rot: -7, depth: 0.45 },
      { left: 46, top: 0, w: 38, rot: 6, depth: 0.2 },
      { left: 30, top: 33, w: 42, rot: 3, depth: 0.85 },
    ],
    2: [
      { left: 10, top: 2, w: 46, rot: -5, depth: 0.3 },
      { left: 44, top: 22, w: 46, rot: 4, depth: 0.85 },
    ],
  },
  slide: {
    3: [
      { left: -2, top: 6, w: 54, rot: -7, depth: 0 },
      { left: 46, top: 2, w: 48, rot: 6, depth: 0 },
      { left: 24, top: 34, w: 52, rot: 3, depth: 0 },
    ],
    2: [
      { left: 2, top: 4, w: 54, rot: -5, depth: 0 },
      { left: 40, top: 22, w: 56, rot: 4, depth: 0 },
    ],
  },
};

export function LookPanel({
  look,
  index,
  total,
  variant,
  image,
}: {
  look: Look;
  index: number;
  total: number;
  variant: "wide" | "slide";
  image?: string;
}) {
  const { product, money, openQuick } = useStore();
  const ink = inkOn(look.backdrop);
  const wide = variant === "wide";
  const slots = SLOTS[variant][look.items.length] ?? SLOTS[variant][3];

  const stage = (
    <div
      className={cn("relative", wide ? "absolute bottom-36 will-change-transform left-[24%] right-[5%] top-[calc(var(--nav-h)+1.5rem)]" : "aspect-[1/1.02] w-full")}
      data-skew
    >
      {image ? (
        <Image src={image} alt={look.title} fill sizes={wide ? "46vw" : "90vw"} className="object-cover" />
      ) : (
        look.items.map((item, i) => {
          const p = product(item.productId);
          const s = slots[i];
          if (!p || !s) return null;
          return (
            <div
              key={`${item.productId}-${i}`}
              data-depth={wide ? s.depth : undefined}
              className={cn("absolute aspect-[240/280]", wide && "will-change-transform")}
              style={{ left: `${s.left}%`, top: `${s.top}%`, width: `${s.w}%`, rotate: `${s.rot}deg`, zIndex: i === 1 && look.items.length === 3 ? 0 : i + 1 }}
            >
              <Garment
                kind={p.kind}
                colour={p.colours[item.colour]?.hex ?? p.colours[0].hex}
                leg={p.leg}
                pocket={p.pocket}
                still
                className="size-full drop-shadow-[0_22px_18px_rgb(0_0_0/0.28)]"
              />
            </div>
          );
        })
      )}
    </div>
  );

  const credits = (
    <div className={cn(wide ? "absolute bottom-36 left-(--margin) w-[21%] min-w-56" : "mt-5 px-1")}>
      <h3 className={cn("font-serif italic leading-[0.95]", wide ? "text-[clamp(1.9rem,1.2rem+1.5vw,3rem)]" : "text-[2rem]")}>{look.title}</h3>
      <p className="mt-2 max-w-[30ch] text-[0.9375rem] leading-snug opacity-80">{look.note}</p>
      <ul className="mt-4">
        {look.items.map((item, i) => {
          const p = product(item.productId);
          if (!p) return null;
          const c = p.colours[item.colour] ?? p.colours[0];
          return (
            <li key={`${item.productId}-${i}`}>
              <button
                type="button"
                onClick={() => openQuick(p.id, { colour: item.colour })}
                onPointerEnter={() => play("tick")}
                data-cursor="view"
                data-cursor-label="SHOP"
                aria-label={`Quick view: ${p.name} in ${c.name}, ${money(p.price)}`}
                className="group flex w-full items-baseline justify-between gap-3 border-t py-2 text-left coarse:py-3"
                style={{ borderColor: `color-mix(in oklab, ${ink} 28%, transparent)` }}
              >
                <span className="text-[0.9375rem] font-medium">
                  <span className="underline-offset-4 group-hover:underline">{p.name}</span>
                  <span className="opacity-80"> — {c.name}</span>
                </span>
                <span className="shrink-0 font-mono text-[0.75rem] tabular-nums">{money(p.price)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <article
      data-look
      aria-label={`Look ${pad(index + 1)} of ${pad(total)}: ${look.title}`}
      className={cn("relative overflow-hidden", wide ? "h-full w-[62vw] shrink-0" : "rounded-[4px] p-4 pb-5")}
      style={{ background: look.backdrop, color: ink }}
    >
      <span
        aria-hidden
        data-depth={wide ? -0.35 : undefined}
        className={cn(
          "fy-outline",
          "pointer-events-none absolute whitespace-nowrap font-display font-black uppercase leading-none",
          wide ? "-left-[2%] bottom-[6%] text-[min(26vh,15vw)] will-change-transform" : "-left-[4%] top-[38%] text-[26vw]",
        )}
        style={{ "--stroke": `color-mix(in oklab, ${ink} 38%, transparent)`, fontVariationSettings: '"wdth" 125' } as CSSProperties}
      >
        {look.word}
      </span>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute z-[4] font-serif italic leading-[0.8]",
          wide ? "left-(--margin) top-[calc(var(--nav-h)+1rem)] text-[clamp(6rem,19vh,13rem)]" : "left-4 top-3 text-[5rem]",
        )}
      >
        {pad(index + 1)}
      </span>
      {stage}
      {credits}
    </article>
  );
}
