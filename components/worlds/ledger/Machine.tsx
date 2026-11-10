"use client";
// Technology as the machine a statement goes through: statement → parser → features → model →
// reasons, packets riding the belts between stations (pure CSS, paused off-screen). Hover, focus or
// tap a part to read why it's there and what passes through that station. Phones: it stands on end.
import { Fragment, useRef, useState, type CSSProperties } from "react";
import { useOnScreen } from "@/lib/hooks";
import { play } from "@/lib/sound";
import type { Tech } from "@/lib/types";
import { cn, pad } from "@/lib/utils";
import type { LedgerScene } from "./scene";

export function Machine({ technologies, pipeline }: { technologies: Tech[]; pipeline: LedgerScene["pipeline"] }) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useOnScreen(ref);
  const [pinned, setPinned] = useState(pipeline.at(-1)?.techs[0] ?? technologies[0]?.name ?? "");
  const [hover, setHover] = useState<string | null>(null);
  const active = hover ?? pinned;
  const tech = technologies.find((t) => t.name === active);
  const at = Math.max(0, pipeline.findIndex((s) => s.techs.includes(active)));
  const station = pipeline[at];

  return (
    <section aria-labelledby="lg-machine" className="frame relative pt-28 md:pt-40">
      <h2
        id="lg-machine"
        data-chaos-type
        className="font-display text-[clamp(3rem,1rem+8vw,10rem)] font-[800] leading-[0.82] tracking-[-0.045em] [font-variation-settings:'wdth'_70]"
      >
        The machine
      </h2>

      <div
        ref={ref}
        data-paused={visible ? undefined : ""}
        className="mt-12 grid grid-cols-1 md:mt-16 lg:grid-cols-[repeat(var(--n),minmax(0,1fr)_2.5rem)] xl:grid-cols-[repeat(var(--n),minmax(0,1fr)_3.5rem)]"
        style={{ "--n": pipeline.length } as CSSProperties}
      >
        {pipeline.map((s, i) => {
          const on = i === at;
          return (
            <Fragment key={s.stage}>
              <div
                className={cn(
                  "relative flex min-w-0 flex-col rounded-[8px] border bg-[#151612] p-4 transition-[border-color,box-shadow] duration-300 lg:min-h-[13.5rem]",
                  on ? "border-(--lg-signal) shadow-[0_0_0_1px_var(--lg-signal),0_20px_40px_-24px_rgb(255_90_31/0.55)]" : "border-(--lg-fg)/14",
                )}
              >
                <p className="flex items-center justify-between gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.14em]">
                  <span className={on ? "text-(--lg-signal)" : "text-(--lg-fg)/55"}>{pad(i + 1)}</span>
                  <span aria-hidden className={cn("size-1.5 rounded-full transition-colors", on ? "bg-(--lg-signal) shadow-[0_0_8px_var(--lg-signal)]" : "bg-(--lg-fg)/25")} />
                </p>
                <p className="mt-3 font-display text-[1.5rem] font-[760] leading-none tracking-[-0.02em] [font-variation-settings:'wdth'_80]">{s.stage}</p>
                <p className="mt-2 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-(--lg-fg)/50">
                  <span className="sr-only">Takes </span>
                  {pipeline[i - 1]?.packet ?? "upload"} <span aria-hidden>→</span>
                  <span className="sr-only">, gives</span> {s.packet}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5 lg:mt-auto lg:pt-5">
                  {s.techs.map((name) => {
                    const sel = name === active;
                    return (
                      <button
                        key={name}
                        type="button"
                        aria-pressed={name === pinned}
                        aria-controls="lg-inspector"
                        data-cursor="hover"
                        onPointerEnter={(e) => {
                          if (e.pointerType !== "mouse") return;
                          setHover(name);
                          play("tick");
                        }}
                        onPointerLeave={() => setHover(null)}
                        onFocus={() => setHover(name)}
                        onBlur={() => setHover(null)}
                        onClick={() => {
                          setPinned(name);
                          play("click");
                        }}
                        className={cn(
                          "inline-flex min-h-10 items-center rounded-[4px] border px-2.5 font-mono text-[0.75rem] font-medium tracking-[0.02em] transition-colors duration-200 coarse:min-h-11",
                          sel ? "border-(--lg-signal) bg-(--lg-signal) text-[#111]" : "border-(--lg-fg)/25 text-(--lg-fg)/85 hover:border-(--lg-fg)/70",
                        )}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Belt packet={s.packet} index={i} hot={on} last={i === pipeline.length - 1} />
            </Fragment>
          );
        })}
      </div>

      <div id="lg-inspector" aria-live="polite" className="mt-8 grid gap-x-(--gutter) gap-y-6 border-t border-(--lg-fg)/14 pt-7 md:mt-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--lg-fg)/55">
            {station?.stage} · {tech?.group}
          </p>
          <p className="mt-3 font-display text-[clamp(2.4rem,1.6rem+2.6vw,4rem)] font-[800] leading-[0.88] tracking-[-0.035em] [font-variation-settings:'wdth'_76]">
            {active}
          </p>
        </div>
        <div className="lg:col-span-7">
          <p className="max-w-[52ch] text-[1.125rem] leading-snug text-(--lg-fg)/85">{tech?.why}</p>
          {station && (
            <p className="lg-paper lg-torn mt-5 max-w-[44rem] px-3.5 pb-2.5 pt-4 font-mono text-[0.75rem] leading-relaxed">
              <span className="opacity-60">{station.packet} › </span>
              {station.sample}
            </p>
          )}
          <p className="mt-4 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--lg-fg)/50">Hover, tap or tab through the parts</p>
        </div>
      </div>
    </section>
  );
}

/** The belt out of a station, carrying what it emits. The last one feeds the desk. */
function Belt({ packet, index, hot, last }: { packet: string; index: number; hot: boolean; last: boolean }) {
  return (
    <div aria-hidden className={cn("lg-belt h-14 lg:h-auto", last && "max-lg:hidden")}>
      <span
        className={cn(
          "lg-packet rounded-[3px] border px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold leading-none tracking-[0.04em]",
          hot ? "border-(--lg-signal) bg-(--lg-signal) text-[#111]" : "border-(--lg-fg)/40 bg-(--lg-bg) text-(--lg-fg)/85",
        )}
        style={{ "--d": `${1.5 + (index % 3) * 0.2}s`, "--o": `${-index * 0.37}s` } as CSSProperties}
      >
        {packet}
      </span>
    </div>
  );
}
