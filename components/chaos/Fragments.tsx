"use client";
import type { CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import { TLink } from "@/components/ui/TLink";
import { Led } from "@/components/ui/marks";
import { cn } from "@/lib/utils";
import type { FragItem, Look, Slot } from "./slots";

// CSS puts each fragment on its edge (so the reduced-motion stickers need no JS);
// the engine only adds a transform on top: drift, cursor shyness, fly-in / fly-out.
function place({ side, at, inset, rot }: Slot): CSSProperties {
  const along = `calc(var(--nav-h) + 1.5rem + (100% - var(--nav-h) - var(--cx-bottom) - 3rem) * ${at})`;
  const across = `calc(6% + 88% * ${at})`;
  const base = { "--rot": `${rot}deg` } as CSSProperties;
  if (side === "left") return { ...base, left: inset, top: along, translate: "0 -50%" };
  if (side === "right") return { ...base, right: inset, top: along, translate: "0 -50%" };
  if (side === "top") return { ...base, top: `calc(var(--nav-h) + ${inset}px)`, left: across, translate: "-50% 0" };
  return { ...base, bottom: `calc(var(--cx-bottom) + ${inset}px)`, left: across, translate: "-50% 0" };
}

const LOOK: Record<Look, string> = {
  led: "flex items-center gap-2 rounded-full bg-ink px-3 py-1.5 text-bone",
  tape: "bg-lime px-4 py-1.5 text-ink [clip-path:polygon(0_12%,4%_0,96%_8%,100%_0,98%_52%,100%_100%,5%_92%,0_100%,2%_48%)]",
  dash: "flex items-center gap-2 border border-dashed border-ink/60 bg-paper/90 px-2.5 py-1.5 text-ink",
  stamp: "rounded-full bg-orange px-3.5 py-1.5 text-ink shadow-hard",
  build: "flex items-center gap-1.5 rounded-[3px] border border-ink bg-paper px-2 py-1 text-ink",
};

export function Fragments({ items, live, compact }: { items: FragItem[]; live: boolean; compact: boolean }) {
  return items.map((it) => {
    const motion = live && "invisible will-change-transform";
    if (it.kind === "project") {
      const p = it.project;
      return (
        <TLink
          key={it.key}
          href={`/work/${p.slug}`}
          kind="world-enter"
          data-cx-frag={it.slot.side}
          data-cursor="open"
          data-cursor-label="ENTER"
          aria-label={`${p.title}: enter world`}
          style={place(it.slot)}
          className={cn(
            "group pointer-events-auto absolute flex items-center whitespace-nowrap rounded-[6px] border border-ink bg-paper text-ink shadow-hard",
            "[rotate:var(--rot)] transition-[rotate,background-color] duration-300 ease-out-expo hover:bg-lime hover:[rotate:0deg] focus-visible:bg-lime focus-visible:[rotate:0deg]",
            compact ? "gap-2 py-1 pl-1 pr-2" : "gap-2.5 py-1.5 pl-1.5 pr-2.5",
            motion,
          )}
        >
          {/* the world's own colours, as a swatch */}
          <span aria-hidden className={cn("relative block shrink-0 overflow-hidden rounded-[4px]", compact ? "size-6" : "size-8")} style={{ background: p.color.bg }}>
            <span className="absolute inset-y-0 right-0 w-[38%]" style={{ background: p.color.accent }} />
          </span>
          <span className="flex flex-col gap-1">
            {!compact && (
              <span className="font-mono text-micro uppercase leading-none tracking-[0.1em] text-smoke">
                {p.id} · {p.category}
              </span>
            )}
            <span className={cn("font-display font-[780] leading-none tracking-[-0.02em]", compact ? "text-[0.8125rem]" : "text-[0.95rem]")}>
              {p.title}
            </span>
          </span>
          <ArrowUpRight
            aria-hidden
            size={14}
            strokeWidth={2}
            className="transition-transform duration-300 ease-out-expo group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </TLink>
      );
    }
    return (
      <div
        key={it.key}
        aria-hidden
        data-cx-frag={it.slot.side}
        style={place(it.slot)}
        className={cn("label absolute whitespace-nowrap [rotate:var(--rot)]", LOOK[it.look], motion)}
      >
        {it.look === "led" && <Led tone="signal" />}
        {it.look === "dash" && (
          <span className="flex gap-0.5">
            <span className="size-1.5 bg-orange" />
            <span className="size-1.5 border border-ink/50" />
            <span className="size-1.5 border border-ink/50" />
          </span>
        )}
        <span data-cx-scramble={it.look === "build" ? undefined : ""}>{it.text}</span>
        {it.look === "build" && <span className="inline-block h-3 w-1.5 animate-blink bg-ink" />}
      </div>
    );
  });
}
