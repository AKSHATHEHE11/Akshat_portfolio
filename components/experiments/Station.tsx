"use client";
import { useEffect, useEffectEvent, useRef, useState, type CSSProperties } from "react";
import { useLenis } from "lenis/react";
import { Maximize2, Minimize2, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useRise } from "@/components/home/worlds/useRise";
import type { Experiment } from "@/data/experiments";
import { ScrollTrigger } from "@/lib/gsap";
import { useOnScreen } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { seeded } from "@/lib/utils";
import { PIECES } from "./pieces";

type Slug = Experiment["slug"];

/** Chaos runs every specimen one step hotter — and the plate says so. */
const HOTTER: Record<Experiment["status"], string> = { stable: "unstable", unstable: "volatile", volatile: "meltdown" };

export interface StationProps {
  x: Experiment;
  index: number;
  active: boolean;
  chaos: boolean;
  reduced: boolean;
  coarse: boolean;
  /** switch this one on now (click, focus, fullscreen) */
  onActivate: (slug: Slug) => void;
  /** scroll put this station under / took it away from the middle of the viewport */
  onScroll: (slug: Slug, inView: boolean) => void;
}

/**
 * One specimen station: title, spec plate, instruction verb, note and the chamber.
 * The chamber mounts its piece once the station is a viewport away and runs it only while this
 * station is the switched-on one and actually on screen. RESET remounts the piece; FULLSCREEN uses
 * the Fullscreen API, or takes over the viewport where there is none (iPhone).
 */
export function Station({ x, index, active, chaos, reduced, coarse, onActivate, onScroll }: StationProps) {
  const root = useRef<HTMLElement>(null);
  const head = useRef<HTMLHeadingElement>(null);
  const chamber = useRef<HTMLDivElement>(null);
  const near = useOnScreen(chamber, "100% 0px");
  const seen = useOnScreen(chamber, "0px");
  const [mounted, setMounted] = useState(false);
  if (near && !mounted) setMounted(true);
  const [reset, setReset] = useState(0);
  const [full, setFull] = useState<"" | "api" | "css">("");
  const lenis = useLenis();
  const live = active && (seen || full !== "");
  useRise(head);

  // The middle of the viewport decides which station is switched on (debounced so a fast scroll
  // past a station never boots it). The first station also counts while it peeks below the header.
  const report = useEffectEvent((inView: boolean) => onScroll(x.slug, inView));
  useEffect(() => {
    let t = 0;
    const st = ScrollTrigger.create({
      trigger: root.current,
      start: index === 0 ? "top 78%" : "top center",
      end: "bottom center",
      onToggle: (self) => {
        window.clearTimeout(t);
        t = window.setTimeout(() => report(self.isActive), 200);
      },
    });
    return () => {
      window.clearTimeout(t);
      st.kill();
    };
  }, [index]);

  /* ── fullscreen ── */
  useEffect(() => {
    const sync = () => setFull((f) => (document.fullscreenElement === chamber.current ? "api" : f === "api" ? "" : f));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  // Fullscreen either way, the page underneath must not scroll: a wheel over the piece would roll the
  // bench and switch another station on, freezing the one on screen. Esc is native for the API.
  useEffect(() => {
    if (!full) return;
    lenis?.stop();
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull("");
    };
    if (full === "css") window.addEventListener("keydown", esc);
    return () => {
      lenis?.start();
      window.removeEventListener("keydown", esc);
    };
  }, [full, lenis]);

  const toggleFull = () => {
    const el = chamber.current;
    if (!el) return;
    play(full ? "close" : "open");
    if (full === "api") return void document.exitFullscreen().catch(() => setFull(""));
    if (full === "css") return setFull("");
    onActivate(x.slug);
    if (document.fullscreenEnabled && el.requestFullscreen) el.requestFullscreen().catch(() => setFull("css"));
    else setFull("css");
  };

  const Piece = PIECES[x.slug];
  const side = index % 2 ? "right" : "left";
  const glitch = { "--gd": `${(seeded(index * 17 + 5) * 2.4).toFixed(2)}s` } as CSSProperties;

  return (
    <section
      ref={root}
      id={x.slug}
      data-rail={x.title}
      data-side={side}
      data-long={x.title.length > 15 || undefined}
      className="frame xp-station"
      aria-labelledby={`${x.slug}-t`}
    >
      <h2 ref={head} id={`${x.slug}-t`} className="xp-title" aria-label={x.title} data-chaos-type>
        <span className="block overflow-clip pb-[0.05em]">
          <span data-rise className="display block">
            {x.title}
          </span>
        </span>
      </h2>

      <div className="xp-plate-slot">
        <div className="xp-plate" style={glitch}>
          <span aria-hidden className="xp-screw left-2 top-2" style={{ "--r": "35deg" } as CSSProperties} />
          <span aria-hidden className="xp-screw right-2 top-2" style={{ "--r": "-20deg" } as CSSProperties} />
          <span aria-hidden className="xp-screw bottom-2 left-2" style={{ "--r": "80deg" } as CSSProperties} />
          <span aria-hidden className="xp-screw bottom-2 right-2" style={{ "--r": "10deg" } as CSSProperties} />
          <p className="label flex items-baseline justify-between gap-4 px-2">
            <span className="xp-glitch text-[0.8125rem]">{x.id}</span>
            <span className="xp-glitch tabular-nums">{x.year}</span>
          </p>
          <span aria-hidden className="xp-plate-rule" />
          <p className="label flex items-center gap-2 px-2">
            <span aria-hidden className="xp-led animate-pulse-dot" data-tone={x.status} />
            <span className="calm-only">Status: {x.status}</span>
            <span className="chaos-only xp-glitch">Status: {HOTTER[x.status]}</span>
          </p>
          <p className="label xp-plate-tags px-2">{x.tags.join(" · ")}</p>
        </div>
      </div>

      <p className="xp-verb serif-accent">
        <svg viewBox="0 0 48 24" fill="none" aria-hidden data-chaos-drift>
          <path d="M2 13 C12 9 22 15 32 11 C37 9 41 10 45 11" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M37 4 L45.5 11 L37 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{x.verb}</span>
      </p>

      <p className="xp-note">{x.note}</p>

      <div
        ref={chamber}
        role="group"
        aria-label={`${x.title}, live specimen`}
        className="xp-chamber"
        data-live={live || undefined}
        data-full={full || undefined}
        onPointerDownCapture={() => !active && onActivate(x.slug)}
        onFocusCapture={() => !active && onActivate(x.slug)}
      >
        <div className="xp-bar">
          {live ? (
            <span className="xp-state label">
              <span aria-hidden className="xp-state-dot animate-pulse-dot" />
              Live
            </span>
          ) : (
            <button type="button" className="xp-state label" onClick={() => onActivate(x.slug)} data-cursor="hover">
              <span aria-hidden className="xp-state-dot" />
              <span>Still</span>
              <span className="xp-state-run inline-flex items-center gap-1 text-[#d8ff00]/80">
                <Play aria-hidden size={10} strokeWidth={2.5} />
                Run
              </span>
            </button>
          )}
          <span className="label truncate max-sm:hidden">
            {x.id} / {x.title}
          </span>
          <span className="ml-auto flex gap-2">
            <span data-chaos-escape className="inline-flex">
              <Button variant="key" size="sm" magnetic={false} icon={null} aria-label={`Reset ${x.title}`} onClick={() => setReset((r) => r + 1)}>
                <RotateCcw aria-hidden size={14} strokeWidth={1.75} />
                <span className="max-sm:hidden">Reset</span>
              </Button>
            </span>
            <Button
              variant="key"
              size="sm"
              magnetic={false}
              icon={null}
              aria-label={full ? "Exit fullscreen" : `Fullscreen ${x.title}`}
              aria-pressed={!!full}
              onClick={toggleFull}
            >
              {full ? <Minimize2 aria-hidden size={14} strokeWidth={1.75} /> : <Maximize2 aria-hidden size={14} strokeWidth={1.75} />}
              <span className="max-sm:hidden">{full ? "Exit" : "Full"}</span>
            </Button>
          </span>
        </div>
        <div className="xp-screen">
          {mounted ? (
            <Piece key={reset} active={live} chaos={chaos} reduced={reduced} coarse={coarse} title={x.title} year={x.year} />
          ) : null}
        </div>
      </div>
    </section>
  );
}
