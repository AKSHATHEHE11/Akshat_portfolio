"use client";
// Technology as the machine a statement goes through: statement → parser → features → model →
// reasons, packets riding the belts between stations (pure CSS, paused off-screen).
// Desktop: hover, focus or click a part and the inspector under the machine says why it's there.
// Phones: the machine stands on end as compact rows, and tapping a part opens its readout inside its
// own station (several can stay open, so nothing above the finger ever moves).
import { Fragment, useRef, useState, type CSSProperties } from "react";
import { useMediaQuery, useOnScreen } from "@/lib/hooks";
import { play } from "@/lib/sound";
import type { Tech } from "@/lib/types";
import { cn, pad } from "@/lib/utils";
import type { LedgerScene } from "./scene";

type Station = LedgerScene["pipeline"][number];

export function Machine({ technologies, pipeline }: { technologies: Tech[]; pipeline: LedgerScene["pipeline"] }) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useOnScreen(ref);
  const wide = useMediaQuery("(min-width: 1024px)");
  const last = pipeline.length - 1;
  const first = pipeline[last]?.techs[0] ?? technologies[0]?.name ?? "";
  const [pinned, setPinned] = useState(first);
  const [hover, setHover] = useState<string | null>(null);
  // phones: which part each open station is showing (the last station starts open)
  const [opened, setOpened] = useState<Record<number, string>>(() => (first ? { [last]: first } : {}));
  const active = hover ?? pinned;
  const tech = technologies.find((t) => t.name === active);
  const at = Math.max(0, pipeline.findIndex((s) => s.techs.includes(active)));
  const station = pipeline[at];

  const choose = (i: number, name: string) => {
    setPinned(name);
    setOpened((o) => {
      const next = { ...o };
      if (next[i] === name) delete next[i];
      else next[i] = name;
      return next;
    });
    play("click");
  };

  return (
    <section aria-labelledby="lg-machine" className="frame relative pt-28 md:pt-40">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <h2
          id="lg-machine"
          data-chaos-type
          className="font-display text-[clamp(3rem,1rem+8vw,10rem)] font-[800] leading-[0.82] tracking-[-0.045em] [font-variation-settings:'wdth'_70]"
        >
          The machine
        </h2>
        <p className="max-w-[36ch] text-[1.0625rem] leading-snug text-(--lg-fg)/70">
          Everything a statement line passes through on its way to a reason code. Pick a part to see why it’s there.
        </p>
      </div>

      <div
        ref={ref}
        data-paused={visible ? undefined : ""}
        className="mt-12 grid grid-cols-1 md:mt-16 lg:grid-cols-[repeat(var(--n),minmax(0,1fr)_2.5rem)] xl:grid-cols-[repeat(var(--n),minmax(0,1fr)_3.5rem)]"
        style={{ "--n": pipeline.length } as CSSProperties}
      >
        {pipeline.map((s, i) => {
          const on = i === at;
          const open = opened[i];
          const shown = technologies.find((t) => t.name === open);
          return (
            <Fragment key={s.stage}>
              <div
                className={cn(
                  "relative min-w-0 rounded-[8px] border bg-[#151612] px-3.5 py-3 transition-[border-color,box-shadow] duration-300 lg:flex lg:min-h-[13.5rem] lg:flex-col lg:p-4",
                  on ? "lg:border-(--lg-signal) lg:shadow-[0_0_0_1px_var(--lg-signal),0_20px_40px_-24px_rgb(255_90_31/0.55)]" : "lg:border-(--lg-fg)/14",
                  open ? "max-lg:border-(--lg-signal)/70" : "max-lg:border-(--lg-fg)/14",
                )}
              >
                <div className="flex items-center justify-between gap-3 lg:contents">
                  <div className="min-w-0 lg:contents">
                    <p className="flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.14em] lg:justify-between">
                      <span className={cn(on ? "lg:text-(--lg-signal)" : "lg:text-(--lg-fg)/55", open ? "max-lg:text-(--lg-signal)" : "max-lg:text-(--lg-fg)/55")}>{pad(i + 1)}</span>
                      <span
                        aria-hidden
                        className={cn(
                          "size-1.5 rounded-full transition-colors",
                          on ? "lg:bg-(--lg-signal) lg:shadow-[0_0_8px_var(--lg-signal)]" : "lg:bg-(--lg-fg)/25",
                          open ? "max-lg:bg-(--lg-signal) max-lg:shadow-[0_0_8px_var(--lg-signal)]" : "max-lg:bg-(--lg-fg)/25",
                        )}
                      />
                    </p>
                    <p className="mt-1 font-display text-[1.375rem] font-[760] leading-none tracking-[-0.02em] [font-variation-settings:'wdth'_80] lg:mt-3 lg:text-[1.5rem]">
                      {s.stage}
                    </p>
                    <p className="mt-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-(--lg-fg)/55 lg:mt-2">
                      <span className="sr-only">Takes </span>
                      {pipeline[i - 1]?.packet ?? "upload"} <span aria-hidden>→</span>
                      <span className="sr-only">, gives</span> {s.packet}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1.5 lg:mt-auto lg:justify-start lg:pt-5">
                    {s.techs.map((name) => {
                      const sel = name === active;
                      const mine = open === name;
                      return (
                        <button
                          key={name}
                          type="button"
                          aria-pressed={wide ? name === pinned : mine}
                          aria-controls={wide ? "lg-inspector" : `lg-readout-${i}`}
                          data-cursor="hover"
                          onPointerEnter={(e) => {
                            if (e.pointerType !== "mouse") return;
                            setHover(name);
                            play("tick");
                          }}
                          onPointerLeave={() => setHover(null)}
                          onFocus={() => setHover(name)}
                          onBlur={() => setHover(null)}
                          onClick={() => choose(i, name)}
                          className={cn(
                            "inline-flex min-h-10 items-center rounded-[4px] border px-2.5 font-mono text-[0.75rem] font-medium tracking-[0.02em] transition-colors duration-200 coarse:min-h-11",
                            sel ? "lg:border-(--lg-signal) lg:bg-(--lg-signal) lg:text-[#111]" : "lg:border-(--lg-fg)/25 lg:text-(--lg-fg)/85 lg:hover:border-(--lg-fg)/70",
                            mine ? "max-lg:border-(--lg-signal) max-lg:bg-(--lg-signal) max-lg:text-[#111]" : "max-lg:border-(--lg-fg)/25 max-lg:text-(--lg-fg)/85",
                          )}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {shown && <Readout id={`lg-readout-${i}`} tech={shown} station={s} />}
              </div>
              <Belt packet={s.packet} index={i} hot={on} last={i === last} />
            </Fragment>
          );
        })}
      </div>

      <div id="lg-inspector" aria-live="polite" className="mt-10 hidden gap-x-(--gutter) gap-y-6 border-t border-(--lg-fg)/14 pt-7 lg:grid lg:grid-cols-12">
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
        </div>
      </div>
    </section>
  );
}

/** Phones: what a part does, printed out of its own station. */
function Readout({ id, tech, station }: { id: string; tech: Tech; station: Station }) {
  return (
    <div id={id} className="mt-3 border-t border-dashed border-(--lg-fg)/20 pt-3 lg:hidden">
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--lg-signal)">
        {tech.name} · {tech.group}
      </p>
      <p className="mt-1.5 max-w-[60ch] text-[1rem] leading-snug text-(--lg-fg)/85">{tech.why}</p>
      <p className="lg-paper lg-torn mt-3 max-w-[40rem] px-3 pb-2 pt-3.5 font-mono text-[0.6875rem] leading-relaxed">
        <span className="opacity-60">{station.packet} › </span>
        {station.sample}
      </p>
    </div>
  );
}

/** The belt out of a station, carrying what it emits. The last one feeds the desk. */
function Belt({ packet, index, hot, last }: { packet: string; index: number; hot: boolean; last: boolean }) {
  return (
    <div aria-hidden className={cn("lg-belt h-11 lg:h-auto", last && "max-lg:hidden")}>
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
