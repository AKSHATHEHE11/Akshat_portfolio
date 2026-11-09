"use client";
// The patch bay under the hero: three modules that route into the site, plus a dark display module.
// Copy comes from /data (the think pipeline + the experiment lab), so it changes with the content.
import { ArrowUpRight } from "lucide-react";
import { experiments } from "@/data/experiments";
import { profile } from "@/data/profile";
import { pipeline } from "@/data/think";
import { TLink } from "@/components/ui/TLink";
import { Corners } from "@/components/ui/marks";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { Terrain } from "./Terrain";

const line = (id: (typeof pipeline)[number]["id"]) => pipeline.find((p) => p.id === id)?.line ?? "";
const restless = experiments.filter((e) => e.status !== "stable").length;

const MODULES = [
  { id: "design", title: "Design", line: line("design"), href: "/think", Glyph: DesignGlyph },
  { id: "develop", title: "Develop", line: line("build"), href: "/work", Glyph: DevelopGlyph },
  {
    id: "experiment",
    title: "Experiment",
    line: `${experiments.length} experiments on the bench. ${restless} of them refuse to sit still.`,
    href: "/experiments",
    Glyph: FlaskGlyph,
  },
] as const;

export function Modules({ className }: { className?: string }) {
  return (
    <nav aria-label="Ways in" className={cn("grid grid-cols-2 gap-(--gutter) lg:grid-cols-[1fr_1fr_1fr_0.78fr]", className)}>
      {MODULES.map(({ id, title, line: copy, href, Glyph }) => (
        <TLink key={id} href={href} data-module data-cursor="hover" className={cn("hero-mod", "group/mod")} onPointerEnter={() => play("tick")}>
          <span aria-hidden className={"hero-mod__fill"} />
          <Glyph className={"hero-mod__glyph"} />
          <span className="relative min-w-0">
            <span className="flex items-center gap-2">
              <span aria-hidden className={"hero-mod__led"} />
              <span className="font-display text-[0.95rem] font-[760] uppercase tracking-[0.07em] lg:text-[1.05rem]">{title}</span>
              <ArrowUpRight
                aria-hidden
                size={16}
                strokeWidth={2}
                className="transition-transform duration-300 ease-out-expo group-hover/mod:-translate-y-0.5 group-hover/mod:translate-x-0.5"
              />
            </span>
            <span className={cn("hero-mod__copy", "mt-1.5 block text-pretty text-[0.8125rem] leading-[1.38] lg:text-[0.875rem]")}>{copy}</span>
          </span>
          <span aria-hidden className={"hero-mod__jack"} />
        </TLink>
      ))}
      <div data-module data-chaos-drift role="img" aria-label={`Live wireframe terrain, ${profile.location.city}`} className={"hero-terrain"}>
        <Terrain />
        <Corners className="text-signal/80" size={12} inset={9} weight={1.5} />
        <span className="label absolute bottom-3 left-4 text-signal">{profile.location.coords}</span>
      </div>
    </nav>
  );
}

/* ── line-art glyphs. Each one does one small thing while its module is hovered or focused. ── */

function DesignGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="9" width="54" height="44" rx="4" />
      <path d="M5 17h54" />
      <circle cx="10" cy="13" r="0.9" fill="currentColor" />
      <circle cx="14" cy="13" r="0.9" fill="currentColor" />
      <path className={"hero-g-draw"} pathLength={100} d="M13 44 C20 26 33 48 51 27" />
      <g className={"hero-g-handle"}>
        <path d="M13 44 L22 27" />
        <circle cx="22" cy="27" r="2" fill="currentColor" />
      </g>
      <rect x="11" y="42" width="4" height="4" fill="var(--bg)" />
      <rect x="49" y="25" width="4" height="4" fill="var(--bg)" />
    </svg>
  );
}

function DevelopGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <g className={"hero-g-back"}>
        <rect x="15" y="7" width="44" height="34" rx="4" />
        <path d="M15 14h44" />
      </g>
      <rect x="5" y="19" width="44" height="34" rx="4" fill="var(--bg)" className={"hero-g-front"} />
      <path d="M5 26h44" />
      <path className={"hero-g-lt"} d="M20 33 L15 38.5 L20 44" />
      <path className={"hero-g-gt"} d="M34 33 L39 38.5 L34 44" />
      <path d="M29 32 L25 45" />
      <path className={"hero-g-caret"} d="M43 34v9" />
    </svg>
  );
}

function FlaskGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path className={"hero-g-liquid"} d="M18.5 41 Q25 37.5 32 41 T45.5 41 L50 49.5 A4 4 0 0 1 46.5 55.5 H17.5 A4 4 0 0 1 14 49.5 Z" stroke="none" />
      <path d="M25 7 H39 M27.5 7 V23.5 L13.6 49.2 A4.2 4.2 0 0 0 17.3 55.5 H46.7 A4.2 4.2 0 0 0 50.4 49.2 L36.5 23.5 V7" />
      <circle className={"hero-g-bubble"} cx="28" cy="47" r="1.8" />
      <circle className={"hero-g-bubble"} cx="35" cy="49" r="1.3" />
      <circle className={"hero-g-bubble"} cx="31.5" cy="45" r="1.1" />
    </svg>
  );
}
