"use client";
import type { CSSProperties } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { Morph } from "@/components/transitions/Morph";
import { morph } from "@/lib/transitions";
import { cn } from "@/lib/utils";
import { LiveScreen } from "../LiveScreen";
import type { WorldProps } from "../types";
import { brandFonts } from "./fonts";

/**
 * A project that has a real website: no world, no effects — the project's own fonts and colours,
 * the site running inside this page, a link to the real thing, and (optionally) what it does
 * differently in a few steps.
 */
export default function ShowcaseWorld({ project }: WorldProps) {
  const { slug, title, tagline, description, category, year, color, live, highlights } = project;
  if (!live) return null;
  const font = brandFonts[slug];
  const host = new URL(live.url).host.replace(/^www\./, "");
  const display = cn(font?.display, "font-extrabold leading-[0.9] tracking-[-0.01em]");

  return (
    <div className={cn(font?.body, "relative pb-28")} style={{ backgroundColor: color.bg, color: color.fg } as CSSProperties}>
      <section id="cover" aria-label={title} className="relative isolate flex min-h-[78svh] flex-col justify-end px-(--margin) pb-14 pt-[calc(var(--nav-h)+3rem)]">
        <Morph name={morph.stage(slug)}>
          <div aria-hidden className="absolute inset-0 -z-10" style={{ backgroundColor: color.bg }} />
        </Morph>
        <p className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] opacity-70">
          {category} · {year}
        </p>
        <Morph name={morph.title(slug)} variant="text">
          <h1 className={cn(display, "mt-4 w-fit text-[clamp(4rem,15vw,12.5rem)]")}>{title}</h1>
        </Morph>
        <p className="mt-6 max-w-[30ch] text-[clamp(1.25rem,1rem+1vw,1.75rem)] font-medium leading-snug">{tagline}</p>
        <p className="mt-3 max-w-[58ch] text-[1.0625rem] leading-relaxed opacity-80">{description}</p>
        <div className="mt-9 flex flex-wrap gap-3">
          <a
            href={live.url}
            target="_blank"
            rel="noreferrer"
            data-cursor="hover"
            className="inline-flex h-12 items-center gap-2 rounded-[6px] px-6 font-semibold transition-opacity hover:opacity-85"
            style={{ backgroundColor: color.accent, color: color.bg }}
          >
            Visit {host} <ArrowUpRight size={18} aria-hidden />
          </a>
          <a href="#preview" data-cursor="hover" className="inline-flex h-12 items-center gap-2 rounded-[6px] border border-current/30 px-6 font-semibold transition-colors hover:border-current">
            See it here <ArrowDown size={18} aria-hidden />
          </a>
        </div>
      </section>

      <section id="preview" aria-label={`${title}: the website`} className="scroll-mt-[var(--nav-h)] px-(--margin) py-14">
        <div className="mx-auto max-w-[min(72rem,calc((100svh-16rem)*1.6))]">
          <p className="mb-4 text-[0.8125rem] font-medium uppercase tracking-[0.14em] opacity-70">
            {live.mode === "embed" ? "The website, running inside this page" : "The website, as it looks today"}
          </p>
          <LiveScreen live={live} title={title} />
        </div>
      </section>

      {highlights && (
        <section id="highlights" aria-labelledby="sc-highlights" className="scroll-mt-[var(--nav-h)] px-(--margin) py-20">
          <div className="mx-auto max-w-[72rem]">
            <h2 id="sc-highlights" className={cn(display, "text-[clamp(2.5rem,1.6rem+4vw,5rem)]")}>
              {highlights.title}
            </h2>
            {highlights.intro && <p className="mt-4 max-w-[52ch] text-[1.125rem] leading-relaxed opacity-80">{highlights.intro}</p>}
            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {highlights.steps.map((s, i) => (
                <li key={s.title} className="flex flex-col gap-3 rounded-[8px] border border-current/15 p-6">
                  <span className="text-[0.8125rem] font-semibold uppercase tracking-[0.14em]" style={{ color: color.accent }}>
                    Step {i + 1}
                  </span>
                  <h3 className={cn(display, "text-[1.75rem]")}>{s.title}</h3>
                  <p className="leading-relaxed opacity-80">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
    </div>
  );
}
