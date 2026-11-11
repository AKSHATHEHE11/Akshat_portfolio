"use client";
import { useEffect, useRef, type CSSProperties, type RefObject } from "react";
import { useLenis } from "lenis/react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { TLink } from "@/components/ui/TLink";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion, useSystemReady } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { system, useSystem } from "@/lib/system";
import type { ProjectSummary } from "@/lib/types";
import { clamp, pad } from "@/lib/utils";
import { worldTokens } from "./palette";
import { useWorldNav } from "./useWorldNav";
import "./shell.css";

type Phase = "mount" | "hydrate" | "boot" | "on";

/**
 * The fixed console strip under every world: [ESC] EXIT · the rail of worlds · WORLD 02/06 · ← →,
 * with the world's scroll progress along its top lip. Anchored through page transitions
 * (view-transition-name: world-shell), so it holds still while worlds swap behind it.
 */
export function ControlBar({
  current,
  all,
  index,
  prev,
  next,
  content,
}: {
  current: ProjectSummary;
  all: ProjectSummary[];
  index: number;
  prev: ProjectSummary;
  next: ProjectSummary;
  content: RefObject<HTMLDivElement | null>;
}) {
  const bar = useRef<HTMLElement>(null);
  const progress = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const ready = useSystemReady();
  const booted = useSystem((st) => st.booted);
  const many = all.length > 1;

  useWorldNav(bar, `/work/${prev.slug}`, `/work/${next.slug}`, many);

  // Progress through THIS world's content (the finale counts as arrived). The content's extent is
  // measured when it resizes, never in the scroll callback: a layout read there forced a full layout
  // every frame, right after the worlds' scroll timelines had written their styles.
  const extent = useRef({ top: 0, run: 1 });
  const update = (y = window.scrollY) => {
    const b = bar.current;
    if (!b || !progress.current) return;
    const p = clamp((y - extent.current.top) / extent.current.run);
    progress.current.style.transform = `scaleX(${p.toFixed(4)})`;
    b.toggleAttribute("data-done", p > 0.995);
  };
  useLenis((l) => update(l.scroll));
  useEffect(() => {
    const el = content.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      extent.current = { top: r.top + window.scrollY, run: Math.max(1, r.height - window.innerHeight) };
      update();
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [content]);

  // Slide up once the portal morph has landed, and again after RESTART (parked below the edge while
  // the boot screen is up, so it never pops off and back). Not when the server already painted it in
  // place (reload) or when arriving from another world (it is anchored through that transition).
  // phase = [current, previous distinct]: a StrictMode re-run of the same phase decides the same way.
  const phase = useRef<[Phase, Phase]>(["mount", "mount"]);
  useGSAP(
    () => {
      const now: Phase = !ready ? "hydrate" : booted ? "on" : "boot";
      if (phase.current[0] !== now) phase.current = [now, phase.current[0]];
      const was = phase.current[1];
      if (reduced || now === "hydrate") return;
      if (now === "boot") return void gsap.set(bar.current, { yPercent: 160 });
      const from = system.get().world;
      if (was === "hydrate" || (was === "mount" && from && from !== current.slug)) return;
      gsap.from(bar.current, { yPercent: 160, duration: 1.1, ease: "expo.out", delay: 0.55, clearProps: "transform" });
    },
    { dependencies: [ready, booted, reduced], revertOnUpdate: true },
  );

  return (
    <nav
      ref={bar}
      aria-label="Worlds"
      className="ws-bar"
      style={{ ...worldTokens(current.color), viewTransitionName: "world-shell" }}
    >
      <span className="ws-progress-track" aria-hidden>
        <span ref={progress} className="ws-progress" />
      </span>

      <TLink
        href="/work"
        kind="world-exit"
        className="ws-exit"
        aria-label="Exit to all worlds"
        aria-keyshortcuts="Escape"
        data-cursor="hover"
        onPointerEnter={() => play("tick")}
      >
        <span className="ws-cap" data-cap="esc" aria-hidden>
          <span className="hidden md:inline">Esc</span>
          <X className="md:hidden" size={16} strokeWidth={2} />
        </span>
        <span className="hidden sm:inline">Exit</span>
      </TLink>

      <p className="ws-now">
        <span>
          {pad(index + 1)}/{pad(all.length)}
        </span>
        <b>{current.title}</b>
      </p>

      <ol className="ws-rail">
        {all.map((p, j) => (
          <li key={p.slug}>
            {j === index ? (
              <span className="ws-stop" aria-current="page">
                <span>[{p.id}]</span>
                <span className="ws-stop-name">{p.title}</span>
              </span>
            ) : (
              <TLink
                href={`/work/${p.slug}`}
                kind={j > index ? "world-next" : "world-prev"}
                className="ws-stop"
                aria-label={`${p.title}, ${p.category}`}
                data-cursor="hover"
                onPointerEnter={() => play("tick")}
                style={{ "--peek-bg": p.color.bg, "--peek-fg": p.color.fg } as CSSProperties}
              >
                <span>[{p.id}]</span>
                <span className="ws-stop-name">{p.title}</span>
                <span className="ws-peek" aria-hidden>
                  <b>{p.title}</b>
                  <i>{p.category}</i>
                </span>
              </TLink>
            )}
          </li>
        ))}
      </ol>

      <div className="ws-counter" aria-hidden>
        <span>World</span>
        <span className="ws-lcd">
          {pad(index + 1)} / {pad(all.length)}
        </span>
      </div>

      {many && (
        <div className="ws-arrows">
          <TLink
            href={`/work/${prev.slug}`}
            kind="world-prev"
            className="ws-cap"
            data-cap="prev"
            data-cursor="hover"
            aria-label={`Previous world: ${prev.title}`}
            aria-keyshortcuts="ArrowLeft"
            onPointerEnter={() => play("tick")}
          >
            <ArrowLeft size={17} strokeWidth={1.75} aria-hidden />
          </TLink>
          <TLink
            href={`/work/${next.slug}`}
            kind="world-next"
            className="ws-cap"
            data-cap="next"
            data-cursor="hover"
            aria-label={`Next world: ${next.title}`}
            aria-keyshortcuts="ArrowRight"
            onPointerEnter={() => play("tick")}
          >
            <ArrowRight size={17} strokeWidth={1.75} aria-hidden />
          </TLink>
        </div>
      )}
    </nav>
  );
}
