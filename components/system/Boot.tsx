"use client";
import "./boot/boot.css";
import { useEffect, useRef } from "react";
import { useLenis } from "lenis/react";
import { profile } from "@/data/profile";
import { site } from "@/data/site";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion, useSystemReady } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { on, system, useSystem } from "@/lib/system";
import { LINES, bootTimeline, resetBoot } from "./boot/sequence";

/**
 * Cold start. Plays on the first visit of a session and on system.replayBoot() / "boot:replay".
 * Any key, click or tap fast-forwards it. Ends with system.markBooted() — everything with an intro
 * keys off that.
 */
export default function Boot() {
  const root = useRef<HTMLDivElement>(null);
  const ready = useSystemReady();
  const booted = useSystem((s) => s.booted);
  const reduced = useReducedMotion();
  const lenis = useLenis();
  const active = ready && !booted;

  useEffect(() => {
    if (!lenis || !active) return;
    lenis.stop();
    return () => lenis.start();
  }, [lenis, active]);

  // replayBoot() already flips booted → false; this also honours a bare emit("boot:replay").
  useEffect(() => on("boot:replay", () => system.get().booted && system.replayBoot()), []);

  useGSAP(
    () => {
      const el = root.current;
      if (!active || !el) return;
      // The client woke up after the CSS failsafe (12s, boot.css) already cleared the screen: don't
      // throw it back up. Checked on the element itself, not the clock, so RESTART still replays the
      // boot on a page that has been open for a while.
      if (!("live" in el.dataset) && getComputedStyle(el).visibility === "hidden") {
        system.markBooted();
        return;
      }

      el.dataset.live = "";
      resetBoot(el);
      const tl = bootTimeline(el, reduced, () => {
        system.markBooted();
        play("ready");
      }).pause();
      // Stepped from the shared ticker with a capped delta. The boot plays while the rest of the page
      // hydrates; with lagSmoothing(0) a 1–2s hydration stall would otherwise jump GSAP straight past
      // it (measured: 3 rendered frames). A stall now pauses the boot instead of skipping it.
      const step = (_t: number, deltaMs: number) => {
        tl.time(Math.min(tl.duration(), tl.time() + (Math.min(deltaMs, 100) / 1000) * tl.timeScale()));
      };
      gsap.ticker.add(step);

      let skipped = false;
      const skip = () => {
        if (skipped) return;
        skipped = true;
        play("click");
        tl.timeScale(tl.time() < (tl.labels.exit ?? Infinity) ? 7 : 2.5);
      };
      // capture + stop: while booting, keys only skip — nothing underneath reacts to them
      const onKey = (e: KeyboardEvent) => {
        e.stopPropagation();
        skip();
      };
      window.addEventListener("keydown", onKey, true);
      el.addEventListener("pointerdown", skip);
      return () => {
        gsap.ticker.remove(step);
        window.removeEventListener("keydown", onKey, true);
        el.removeEventListener("pointerdown", skip);
        resetBoot(el);
      };
    },
    { scope: root, dependencies: [active, reduced], revertOnUpdate: true },
  );

  return (
    <div ref={root} className="sys-boot" aria-hidden="true">
      <noscript dangerouslySetInnerHTML={{ __html: "<style>.sys-boot{display:none!important}</style>" }} />
      <div className="sys-boot__screen" data-screen="">
        <div className="sys-boot__roll" />
        <div
          data-content=""
          className="sys-boot__content crt frame flex h-full flex-col py-[max(1.25rem,4svh)] text-[clamp(1.15rem,2.1vw,1.85rem)] leading-[1.1]"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 text-[0.62em] opacity-60">
            <span>BUILD {site.build}</span>
            <span className="uppercase">
              {profile.location.city} · {profile.location.coords}
            </span>
          </div>

          <div className="mt-[7svh] space-y-[0.18em]">
            {LINES.map((l, i) => (
              <p key={i} data-log="" className="flex flex-wrap whitespace-pre">
                <span className="opacity-50">&gt; </span>
                <span data-label="" />
                {l.dots ? <span data-dots="" className="opacity-40" /> : null}
                {l.status ? (
                  <span data-status="" className="invisible bg-signal px-[0.35ch] text-ink [text-shadow:none]" />
                ) : null}
              </p>
            ))}
          </div>

          <div className="mt-auto">
            <p className="flex items-end text-[clamp(2.8rem,11.5vw,9.5rem)] leading-[0.8]">
              <span data-ready="" />
              <span className="mb-[0.08em] ml-[0.08em] inline-block h-[0.7em] w-[0.42em] animate-blink bg-signal shadow-[0_0_18px_var(--signal)]" />
            </p>
            <div className="mt-[3svh] flex flex-wrap items-center gap-x-5 gap-y-2">
              <span className="sys-boot__bar">
                <span data-fill="" />
              </span>
              <span data-pct="" className="tabular-nums">
                000%
              </span>
              <span className="ml-auto opacity-70">
                <span className="coarse:hidden">PRESS ANY KEY</span>
                <span className="hidden coarse:inline">TAP</span> TO SKIP
              </span>
            </div>
          </div>
        </div>
        <div className="sys-boot__beam" data-beam="" />
      </div>
      <div className="sys-boot__line" data-scanline="" />
    </div>
  );
}
