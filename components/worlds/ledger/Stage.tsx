"use client";
// Identity: the top of the ledger page. The stage box and the title are the portal morph targets —
// rendered immediately, never animated. Around them the desk wakes up after boot, and the title
// gets stamped EXPLAINED (every score here comes with its reasons).
import { useRef, useSyncExternalStore } from "react";
import { Morph } from "@/components/transitions/Morph";
import { Led } from "@/components/ui/marks";
import { gsap, useGSAP } from "@/lib/gsap";
import { useChaos, useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { useSystem } from "@/lib/system";
import { morph } from "@/lib/transitions";
import type { Project } from "@/lib/types";
import { BASE } from "./engine";
import type { LedgerScene } from "./scene";
import { Stamp } from "./Stamp";

export function Stage({ project }: { project: Project<LedgerScene> }) {
  const { slug, title, color, scene } = project;
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const chaos = useChaos();
  const ready = useSystem((s) => s.ready);
  const booted = useSystem((s) => s.booted);

  // Waits for the boot sequence (and replays with it), so RESTART replays the entrance too.
  useGSAP(
    () => {
      if (reduced) return;
      const q = gsap.utils.selector(ref);
      const parts = q("[data-lg-boot]");
      const stamp = q("[data-lg-stamp]");
      gsap.set([...parts, ...stamp], { autoAlpha: 0 });
      if (!ready) return;
      const enter = () =>
        gsap
          .timeline({ delay: 0.15 })
          .fromTo(parts, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08, ease: "expo.out", clearProps: "transform" })
          // relative to the −9° its wrapper rests at
          .fromTo(
            stamp,
            { autoAlpha: 0, scale: 2.6, rotate: -19 },
            { autoAlpha: 1, scale: 1, rotate: 0, duration: 0.42, ease: "snap", onStart: () => play("drop") },
            0.75,
          );
      if (booted) return void enter();
      gsap.delayedCall(8, enter); // the boot overlay is up; never leave the desk dark if it hangs
    },
    { scope: ref, dependencies: [ready, booted, reduced], revertOnUpdate: true },
  );

  return (
    <section ref={ref} aria-labelledby="lg-title" className="relative isolate">
      <Morph name={morph.stage(slug)}>
        <div aria-hidden className="lg-ruled absolute inset-x-0 top-0 h-svh" style={{ backgroundColor: color.bg }} />
      </Morph>

      <div
        data-lg-boot
        className="frame relative z-[2] flex items-center justify-between gap-4 pt-[calc(var(--nav-h)+0.75rem)] font-mono text-[0.6875rem] uppercase tracking-[0.14em]"
      >
        <p className="flex min-w-0 items-center gap-2">
          <Led tone={chaos ? "signal" : "go"} />
          <span className="truncate">
            {chaos ? "Books won’t balance" : "Desk open"}
            <span className="text-(--lg-fg)/60"> · {scene.desk.lender}, {scene.desk.city}</span>
          </span>
        </p>
        <p className="hidden text-(--lg-fg)/60 lg:block">
          Model {scene.desk.model} · {scene.desk.features} features · base {BASE}
        </p>
        <Clock />
      </div>

      <div className="frame relative z-[1] mt-14 md:mt-12">
        <div className="relative">
          <Morph name={morph.title(slug)} variant="text">
            <h1
              id="lg-title"
              data-chaos-type
              className="w-fit whitespace-nowrap font-display text-[clamp(4.25rem,20.5vw,21rem)] font-[800] leading-[0.8] tracking-[-0.045em] [font-variation-settings:'wdth'_70]"
            >
              {title}
            </h1>
          </Morph>
          {/* the outer span holds the resting −9°; GSAP folds a CSS `rotate` into its own transform,
              so the landing tween runs on the inner block and stays relative to it */}
          <span
            aria-hidden
            className="pointer-events-none absolute right-[2%] top-[4%] -rotate-[9deg] text-[clamp(1.5rem,0.5rem+2.75vw,3.5rem)] xl:text-[clamp(1.5rem,0.9rem+2.6vw,3.5rem)] max-md:right-1 max-md:top-[-78%] max-md:text-[1.1rem]"
          >
            <span data-lg-stamp className="block origin-center">
              <Stamp tone="signal" label="Explained" sub={`${scene.desk.date} · ${scene.desk.model}`} />
            </span>
          </span>
        </div>
        <div aria-hidden className="lg-total mt-3 md:mt-4" />
        <div data-lg-boot className="mt-5 flex flex-wrap items-baseline justify-between gap-x-10 gap-y-3 md:mt-6">
          <p className="max-w-[26ch] font-serif text-[1.45rem] italic leading-[1.08] md:text-[1.85rem]">{project.tagline}</p>
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--lg-fg)/60">
            {project.category} · {project.year} · {project.status}
          </p>
        </div>
      </div>
    </section>
  );
}

const everySecond = (cb: () => void) => {
  const id = window.setInterval(cb, 1000);
  return () => window.clearInterval(id);
};
const ist = () => new Date().toLocaleTimeString("en-GB", { hour12: false, timeZone: "Asia/Kolkata" });

/** The desk runs on Indian time (null on the server, so server and client markup match). */
function Clock() {
  const now = useSyncExternalStore(everySecond, ist, () => null);
  return (
    <p className="shrink-0 tabular-nums">
      <span className="text-(--lg-fg)/60">IST </span>
      {now ?? "--:--:--"}
    </p>
  );
}
