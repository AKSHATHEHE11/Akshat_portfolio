"use client";
// Technology as the live system diagram of DecisionOS: packets travel the wires (SVG SMIL — no JS loop,
// paused off-screen), and hovering / focusing / tapping a node lights its wires and tells you why it's there.
import { useEffect, useMemo, useRef, useState } from "react";
import { useChaos, useMediaQuery, useOnScreen, useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import type { Tech } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { CommandCenterScene } from "./scene";

type Wiring = CommandCenterScene["wiring"];

// grid → px. Desktop lays the 4×3 grid out wide; phones transpose it (x ↔ y) into a tall column.
const WIDE = { w: 1000, h: 470, cols: 3, rows: 2, px: 92, py: 70 };
const TALL = { w: 360, h: 640, cols: 2, rows: 3, px: 66, py: 50 };

export function Systems({ technologies, wiring }: { technologies: Tech[]; wiring: Wiring }) {
  const wide = useMediaQuery("(min-width: 768px)");
  const box = wide ? WIDE : TALL;
  const ref = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const visible = useOnScreen(ref);
  const reduced = useReducedMotion();
  const chaos = useChaos();

  // the hub (most wires) is selected until the visitor picks something else
  const hub = useMemo(() => {
    const count = (n: string) => wiring.links.filter((l) => l.includes(n)).length;
    return [...wiring.nodes].sort((a, b) => count(b.name) - count(a.name))[0]?.name ?? "";
  }, [wiring]);
  const [pinned, setPinned] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const active = hover ?? pinned ?? hub;

  const pos = useMemo(
    () =>
      new Map(
        wiring.nodes.map((n) => {
          const [x, y] = wide ? [n.x, n.y] : [n.y, n.x];
          return [n.name, { x: box.px + (x / box.cols) * (box.w - 2 * box.px), y: box.py + (y / box.rows) * (box.h - 2 * box.py) }];
        }),
      ),
    [wiring.nodes, wide, box],
  );

  const wires = useMemo(
    () =>
      wiring.links.flatMap(([a, b]) => {
        const p = pos.get(a);
        const q = pos.get(b);
        if (!p || !q) return [];
        // right-angled routing, like traces on a board
        const d = wide ? `M${p.x} ${p.y}H${(p.x + q.x) / 2}V${q.y}H${q.x}` : `M${p.x} ${p.y}V${(p.y + q.y) / 2}H${q.x}V${q.y}`;
        return [{ a, b, d }];
      }),
    [wiring.links, pos, wide],
  );

  useEffect(() => {
    const s = svg.current;
    if (!s) return;
    if (visible) s.unpauseAnimations();
    else s.pauseAnimations();
  }, [visible]);

  const tech = technologies.find((t) => t.name === active);
  const neighbours = wires.filter((w) => w.a === active || w.b === active).map((w) => (w.a === active ? w.b : w.a));

  return (
    <section aria-labelledby="cc-systems" className="frame relative py-24 md:py-32">
      <h2
        id="cc-systems"
        data-chaos-type
        className="font-display text-[clamp(3rem,1rem+8.5vw,10.5rem)] font-[860] uppercase leading-[0.8] tracking-[-0.045em] [font-variation-settings:'wdth'_62]"
      >
        Systems
      </h2>
      <div className="mt-12 grid gap-(--gutter) md:mt-16 xl:grid-cols-12">
        <div
          ref={ref}
          className="relative overflow-hidden rounded-[12px] border border-(--cc-fg)/12 bg-[radial-gradient(circle_at_1px_1px,rgb(233_240_234/0.08)_1px,transparent_0)] bg-[length:22px_22px] xl:col-span-8"
        >
          <div className="relative mx-auto w-full" style={{ aspectRatio: `${box.w} / ${box.h}`, maxWidth: wide ? undefined : "26rem" }}>
            <svg ref={svg} viewBox={`0 0 ${box.w} ${box.h}`} className="absolute inset-0 size-full" aria-hidden>
              {wires.map((w) => {
                const on = w.a === active || w.b === active;
                return (
                  <path
                    key={w.d}
                    d={w.d}
                    fill="none"
                    stroke={on ? (chaos ? "#ff5a1f" : "#d8ff00") : "rgb(233 240 234 / 0.16)"}
                    strokeWidth={on ? 2 : 1.25}
                    className="transition-[stroke] duration-300"
                  />
                );
              })}
              {!reduced &&
                wires.map((w, i) => {
                  const on = w.a === active || w.b === active;
                  const dur = (chaos ? 0.8 : on ? 1.6 : 3.2) + (i % 3) * 0.3;
                  return [0, 1].map((k) => (
                    <circle key={`${w.d}-${k}-${chaos}-${on}`} r={on ? 4 : 2.5} fill={chaos ? "#ff5a1f" : "#d8ff00"} opacity={on ? 1 : 0.45}>
                      <animateMotion dur={`${dur}s`} begin={`-${(k * dur) / 2 + i * 0.37}s`} repeatCount="indefinite" path={w.d} />
                    </circle>
                  ));
                })}
            </svg>
            {wiring.nodes.map((n) => {
              const p = pos.get(n.name);
              if (!p) return null;
              const isOn = n.name === active;
              const linked = neighbours.includes(n.name);
              const group = technologies.find((t) => t.name === n.name)?.group;
              return (
                <button
                  key={n.name}
                  type="button"
                  data-cursor="hover"
                  aria-pressed={(pinned ?? hub) === n.name}
                  aria-controls="cc-inspector"
                  onPointerEnter={() => {
                    setHover(n.name);
                    play("tick");
                  }}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(n.name)}
                  onBlur={() => setHover(null)}
                  onClick={() => {
                    setPinned(n.name);
                    play("click");
                  }}
                  className={cn(
                    "absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-[6px] border px-2.5 py-2 text-left transition-[background-color,border-color,color,box-shadow] duration-300 md:px-3",
                    isOn
                      ? "border-(--cc-accent) bg-(--cc-accent) text-[#07090a] shadow-[0_0_30px_-6px_rgb(216_255_0/0.7)]"
                      : linked
                        ? "border-(--cc-accent)/60 bg-[#0b0f10] text-(--cc-fg)"
                        : "border-(--cc-fg)/18 bg-[#0b0f10] text-(--cc-fg)/85",
                  )}
                  style={{ left: `${(p.x / box.w) * 100}%`, top: `${(p.y / box.h) * 100}%` }}
                >
                  <span aria-hidden className={cn("size-1.5 rounded-full", isOn ? "bg-[#07090a]" : "bg-(--cc-accent)")} />
                  <span>
                    <span className="block text-[0.8125rem] font-[650] leading-none md:text-[0.875rem]">{n.name}</span>
                    {group && <span className="mt-1 block font-mono text-[0.6875rem] uppercase tracking-[0.12em] opacity-60">{group}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <aside
          id="cc-inspector"
          aria-live="polite"
          className="flex flex-col rounded-[12px] border border-(--cc-fg)/12 bg-[#0b0f10] p-6 md:p-7 xl:col-span-4"
        >
          <p className="flex justify-between font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--cc-fg)/60">
            <span>Node inspector</span>
            <span>{tech?.group}</span>
          </p>
          <p className="mt-5 font-display text-[2.6rem] font-[800] leading-[0.88] tracking-[-0.035em] [font-variation-settings:'wdth'_92]">{active}</p>
          <p className="mt-5 text-[1.125rem] leading-snug text-(--cc-fg)/85">{tech?.why}</p>
          {neighbours.length > 0 && (
            <p className="mt-auto pt-8 font-mono text-[0.75rem] leading-relaxed text-(--cc-fg)/55">
              <span className="text-(--cc-accent)">Wired to — </span>
              {neighbours.join(" · ")}
            </p>
          )}
          <p className="mt-3 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--cc-fg)/55">Hover, tap or tab through the nodes</p>
        </aside>
      </div>
    </section>
  );
}
