"use client";
import type { Ref } from "react";
import { Scissors } from "lucide-react";
import { profile } from "@/data/profile";
import { site } from "@/data/site";
import { Led } from "@/components/ui/marks";
import { cn, pad } from "@/lib/utils";
import { Barcode } from "./Barcode";
import { Stamps } from "./Stamps";
import { Sticker } from "./Sticker";
import "./identity.css";
import { Mark } from "@/components/system/graffiti/Graffiti";

const spec = (key: string) => profile.spec.find((r) => r.key === key)?.value;
const MODEL = spec("Model") ?? profile.initials;
const CLASS = spec("Class");
const WARRANTY = spec("Warranty");
const ROWS = profile.spec.filter((r) => !["Model", "Class", "Warranty"].includes(r.key));
const COMP = profile.composition;
const FILL = [
  "bg-ink",
  "bg-[repeating-linear-gradient(-45deg,#111_0_1.5px,transparent_1.5px_5px)]",
  "bg-[radial-gradient(#111_1px,transparent_1.3px)] bg-[length:5px_5px]",
];
// the last ingredient (chaos) is the only one in colour
const fill = (i: number) => (i === COMP.length - 1 ? "bg-signal" : FILL[i % FILL.length]);

/** A number that scrambles in chaos mode (see Identity). */
const Num = ({ v }: { v: string | number }) => <span data-num={v}>{v}</span>;

const H3 = "font-mono text-micro font-semibold uppercase tracking-[0.14em]";

/** The printed spec label itself. `unit` is the print run counter (FEED reprints). */
export function Datasheet({ unit, stickerRef }: { unit: number; stickerRef: Ref<HTMLDivElement> }) {
  const serial = `${MODEL.replace(/[^a-z0-9]/gi, "").toUpperCase()}-${site.build.replace(/\D/g, "")}-${pad(unit, 4)}`;
  const { availability } = profile;

  return (
    <article aria-labelledby="identity-title" className="dsheet-paper md:grid md:grid-cols-[minmax(0,1fr)_8.5rem]">
      <div className="p-[clamp(1.25rem,2.8vw,2.5rem)]">
        <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-ink pb-3">
          <p className="font-display text-[0.95rem] font-semibold uppercase tracking-[0.06em]">{profile.name}</p>
          <p className="font-mono text-micro uppercase tracking-[0.14em] text-smoke">
            Datasheet · Rev <Num v={site.build} />
          </p>
        </header>

        <div className="relative grid gap-x-10 gap-y-4 border-b border-ink/15 py-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end">
          <Mark shape="crown" paint="orange" tilt={-12} weight={8} className="-top-3 -left-4 w-[clamp(3.5rem,7vw,6rem)]" />
          <h2 id="identity-title" className="display text-[clamp(4.25rem,2rem+8vw,9.5rem)] leading-[0.8] tracking-[-0.055em]">
            <span className="sr-only">{profile.name}, model </span>
            {MODEL.split(/(\d+)/).map((part, i) => (/^\d+$/.test(part) ? <Num key={i} v={part} /> : part))}
          </h2>
          <div className="pb-1">
            <p className="font-mono text-micro uppercase tracking-[0.14em] text-smoke">{profile.roles.join(" / ")}</p>
            {CLASS && <p className="mt-2 text-[clamp(1.1rem,0.9rem+0.6vw,1.5rem)] font-medium leading-tight">{CLASS}</p>}
          </div>
        </div>

        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-ink/15 py-3">
          <Led tone={availability.open ? "go" : "signal"} />
          <span className="font-mono text-[0.75rem] font-semibold uppercase tracking-[0.1em]">
            {availability.open ? "In stock" : "Back-ordered"}
          </span>
          <span className="text-[0.9rem] text-smoke">{availability.label}</span>
        </p>

        <div className="grid gap-8 py-6 md:grid-cols-2 md:gap-10">
          <section aria-labelledby="identity-spec">
            <h3 id="identity-spec" className={H3}>
              1 — Specifications
            </h3>
            <dl className="mt-3 border-t-2 border-ink">
              {ROWS.map((r) => (
                <div key={r.key} className="grid grid-cols-[minmax(6.5rem,40%)_minmax(0,1fr)] gap-4 border-b border-ink/15 py-2.5">
                  <dt className="pt-[0.2em] font-mono text-micro uppercase tracking-[0.1em] text-smoke">{r.key}</dt>
                  <dd className="text-[0.95rem] leading-snug">{r.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="identity-comp">
            <h3 id="identity-comp" className={H3}>
              2 — Material composition
            </h3>
            <div className="mt-3 border-t-2 border-ink pt-4">
              <div
                role="img"
                aria-label={COMP.map((c) => `${c.value}% ${c.label}`).join(", ")}
                className="flex h-7 w-full overflow-hidden rounded-[3px] ring-1 ring-ink"
              >
                {COMP.map((c, i) => (
                  <span key={c.label} style={{ flexGrow: c.value }} className={cn("h-full basis-0 border-r border-ink last:border-r-0", fill(i))} />
                ))}
              </div>
              <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5">
                {COMP.map((c, i) => (
                  <li key={c.label} className="flex items-center gap-2.5 font-mono text-[0.75rem] uppercase tracking-[0.08em]">
                    <span aria-hidden className={cn("size-3 shrink-0 rounded-[2px] ring-1 ring-ink", fill(i))} />
                    <span className="w-[3.5ch] font-semibold tabular-nums">
                      <Num v={c.value} />%
                    </span>
                    {c.label}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        <div className="relative flex flex-wrap items-end gap-x-4 gap-y-1 border-t border-ink/15 pt-5 sm:block sm:pr-[10rem]">
          <Stamps />
          <div ref={stickerRef} className="-mt-3 ml-auto sm:absolute sm:-top-10 sm:right-2 sm:mt-0">
            <Sticker
              className="[--size:7.5rem] sm:[--size:9.25rem]"
              under={WARRANTY ? `Warranty ${WARRANTY}` : "No user-serviceable parts"}
              ring={`QUALITY CHECKED · ${MODEL} · ${site.build} · `}
            />
          </div>
        </div>
      </div>

      <aside aria-label="Serial label" className="dsheet-stub px-5 pb-5 pt-6 md:flex md:flex-col md:items-center md:justify-between md:px-4 md:py-7">
        <span aria-hidden className="dsheet-perf" />
        <p aria-hidden className="hidden items-center gap-2 font-mono text-micro uppercase tracking-[0.14em] text-smoke md:flex md:[writing-mode:vertical-rl]">
          <Scissors className="size-3.5" strokeWidth={1.75} /> Tear here
        </p>
        <Barcode value={serial} className="h-14 w-full md:hidden" />
        <Barcode value={serial} vertical className="hidden h-[min(16rem,40vh)] w-12 md:block" />
        <div className="mt-3 flex items-center justify-between gap-4 md:mt-0">
          <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.1em] md:rotate-180 md:[writing-mode:vertical-rl]">
            SN <span data-num={serial}>{serial}</span>
          </p>
          <p aria-hidden className="flex items-center gap-2 font-mono text-micro uppercase tracking-[0.14em] text-smoke md:hidden">
            <Scissors className="size-3.5" strokeWidth={1.75} /> Tear here
          </p>
        </div>
      </aside>
    </article>
  );
}
