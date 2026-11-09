"use client";
// The command room: identity (stage + title) and the working board share one space.
// The stage box and the title are the portal morph targets — rendered immediately, never animated in.
import { useRef, useSyncExternalStore } from "react";
import { Morph } from "@/components/transitions/Morph";
import { Led } from "@/components/ui/marks";
import { gsap, useGSAP } from "@/lib/gsap";
import { useChaos, useReducedMotion } from "@/lib/hooks";
import { useSystem } from "@/lib/system";
import { morph } from "@/lib/transitions";
import type { Project } from "@/lib/types";
import { Board } from "./Board";
import type { CommandCenterScene } from "./scene";

export function Room({ project }: { project: Project<CommandCenterScene> }) {
  const { scene, slug, title, color } = project;
  const ref = useRef<HTMLElement>(null);
  const chaos = useChaos();
  const reduced = useReducedMotion();
  const ready = useSystem((s) => s.ready);
  const booted = useSystem((s) => s.booted);
  const accent = scene.titleAccent && title.endsWith(scene.titleAccent) ? scene.titleAccent : "";
  const head = title.slice(0, title.length - accent.length);

  // Power-on: HUD, globe and console rise, wall screens switch on like CRTs. Waits for the boot
  // sequence (and replays with it), so RESTART replays the whole entrance.
  useGSAP(
    () => {
      if (reduced) return;
      const q = gsap.utils.selector(ref);
      const parts = q("[data-cc-boot]");
      const panels = q("[data-cc-panel]");
      const hide = () => gsap.set([...parts, ...panels], { autoAlpha: 0 });
      const play = () =>
        gsap
          .timeline({ delay: 0.15 })
          .fromTo(parts, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.1, ease: "expo.out", clearProps: "transform" })
          .fromTo(
            panels,
            { autoAlpha: 0, scaleY: 0.02 },
            { autoAlpha: 1, scaleY: 1, duration: 0.55, stagger: 0.11, ease: "machine", clearProps: "transform" },
            0.2,
          );
      hide();
      if (!ready) return; // first paint before the system has read storage: stay dark, decide next tick
      if (booted) return void play();
      gsap.delayedCall(8, play); // boot overlay is up; never leave the room dark if it hangs
    },
    { scope: ref, dependencies: [ready, booted, reduced], revertOnUpdate: true },
  );

  return (
    <section ref={ref} aria-labelledby="cc-title" className="relative isolate overflow-hidden pb-16 md:pb-24">
      <Morph name={morph.stage(slug)}>
        <div aria-hidden className="absolute inset-x-0 top-0 h-svh" style={{ background: color.bg }} />
      </Morph>

      {/* the room itself: floor grid, phosphor scanlines, a slow sweep, vignette — and the alarm in chaos */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="cc-floor absolute inset-x-[-40%] bottom-0 h-[48%]" />
        <div className="cc-scanlines absolute inset-0" />
        <div className="cc-sweep absolute inset-x-0 top-0 h-48" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,transparent_45%,rgb(0_0_0/0.7)_100%)]" />
        <div className="cc-strobe chaos-only absolute inset-0" />
      </div>

      <div
        data-cc-boot
        className="frame relative z-[3] flex items-center justify-between gap-4 pt-[calc(var(--nav-h)+0.75rem)] font-mono text-[0.6875rem] uppercase tracking-[0.14em]"
      >
        <p className="flex items-center gap-2 whitespace-nowrap" data-chaos-drift>
          <Led tone={chaos ? "signal" : "go"} />
          <span className="cc-glitch inline-block">{chaos ? "Order! Order!" : "Board in session"}</span>
          <span className="hidden text-(--cc-fg)/60 sm:inline">· {scene.room.code}</span>
        </p>
        <p className="hidden min-w-0 truncate text-(--cc-fg)/60 lg:block">
          Client — {scene.room.client} · {scene.room.clientLine}
        </p>
        <Clock />
      </div>

      <div className="frame relative z-[2] mt-6 md:mt-10">
        <Morph name={morph.title(slug)} variant="text">
          <h1
            id="cc-title"
            data-chaos-type
            className="whitespace-nowrap font-display text-[clamp(3.25rem,14.4vw,16.5rem)] font-[820] leading-[0.8] tracking-[-0.05em] [font-variation-settings:'wdth'_106]"
          >
            {head}
            {accent && <span className="cc-hollow cc-glitch inline-block">{accent}</span>}
          </h1>
        </Morph>
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-10 gap-y-2 md:mt-6">
          <p className="max-w-[28ch] font-serif text-[1.35rem] italic leading-[1.12] md:text-[1.65rem]">{project.tagline}</p>
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--cc-fg)/55">
            {project.category} · {project.year} · {project.status}
          </p>
        </div>
      </div>

      <div id="preview" className="frame relative z-[1] mt-8 scroll-mt-24 md:mt-12">
        <h2 className="sr-only">Ask the board — a working demo of {title}</h2>
        <Board scene={scene} color={color} title={title} />
      </div>
    </section>
  );
}

const everySecond = (cb: () => void) => {
  const id = window.setInterval(cb, 1000);
  return () => window.clearInterval(id);
};
const localTime = () => new Date().toLocaleTimeString("en-GB", { hour12: false });

/** Local time on the room wall (null on the server, so server and client markup match). */
function Clock() {
  const now = useSyncExternalStore(everySecond, localTime, () => null);
  return (
    <p className="shrink-0 tabular-nums">
      <span className="hidden text-(--cc-fg)/60 sm:inline">Local </span>
      {now ?? "--:--:--"}
    </p>
  );
}
