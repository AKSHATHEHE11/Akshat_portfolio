"use client";
import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { profile } from "@/data/profile";
import { site } from "@/data/site";
import { Scramble } from "@/components/ui/Scramble";
import { gsap } from "@/lib/gsap";
import { useChaos, useCoarse, useReducedMotion, useSystemReady } from "@/lib/hooks";
import { pointer } from "@/lib/pointer";
import { useSystem } from "@/lib/system";
import { cn, pad } from "@/lib/utils";
import { Toasts } from "./hud/Toasts";
import { useWorldInfo } from "./nav/useWorldInfo";

/** Update an element's text in place (keeps the existing Text node, so layout isn't rebuilt). */
function setText(el: HTMLElement, value: string) {
  const node = el.firstChild;
  if (node && node.nodeType === Node.TEXT_NODE && !node.nextSibling) (node as Text).data = value;
  else el.textContent = value;
}

const tz = profile.location.timezone;
// Only ever written from the clock effect, never rendered — server/browser ICU differences can't mismatch.
const clock = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
const zone =
  new Intl.DateTimeFormat("en-IN", { timeZone: tz, timeZoneName: "short" }).formatToParts(0).find((p) => p.type === "timeZoneName")?.value ??
  "LOCAL";

const METER = 8;
const meter = (v: number) => {
  const n = Math.min(METER, Math.round((v / 40) * METER));
  return "|".repeat(n) + "·".repeat(METER - n);
};

/**
 * Found-UI readouts in the corners (fine pointers only): cursor position, scroll velocity, local time,
 * build, current world. Values are written straight into text nodes from the shared ticker — no React
 * render per frame. Difference-blended so they stay legible over light, dark and world backgrounds.
 */
export default function Hud() {
  const ready = useSystemReady();
  const coarse = useCoarse();
  const world = useSystem((s) => s.world);
  const info = useWorldInfo(world);
  const lenis = useLenis();
  const x = useRef<HTMLSpanElement>(null);
  const y = useRef<HTMLSpanElement>(null);
  const vel = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const time = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ready || coarse) return;
    let lx = "";
    let ly = "";
    let lv = "";
    // ~15 updates a second is plenty for a readout, and updating the existing text node's value
    // (instead of textContent, which swaps the node) keeps each write from dirtying page layout.
    let at = 0;
    const tick = () => {
      const now = performance.now();
      if (now - at < 66) return;
      at = now;
      const nx = pad(Math.max(0, Math.round(pointer.x)), 4);
      const ny = pad(Math.max(0, Math.round(pointer.y)), 4);
      const v = Math.abs(lenis?.velocity ?? 0);
      const nv = v.toFixed(2).padStart(5, "0");
      if (nx !== lx && x.current) setText(x.current, (lx = nx));
      if (ny !== ly && y.current) setText(y.current, (ly = ny));
      if (nv !== lv) {
        lv = nv;
        if (vel.current) setText(vel.current, nv);
        if (bar.current) setText(bar.current, meter(v));
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [ready, coarse, lenis]);

  useEffect(() => {
    if (!ready || coarse) return;
    const write = () => {
      if (time.current) setText(time.current, `${zone} ${clock.format(Date.now())}`);
    };
    write();
    const id = window.setInterval(write, 1000);
    return () => window.clearInterval(id);
  }, [ready, coarse]);

  return (
    <>
      <div
        aria-hidden
        style={{ viewTransitionName: "site-hud" }}
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-0 z-[50] hidden justify-between px-(--margin) pb-3 font-mono text-[0.625rem] uppercase leading-none tracking-[0.16em] text-muted mix-blend-difference md:fine:flex",
          "transition-[translate,opacity] delay-300 duration-700 ease-out-expo [html[data-booted='0']_&]:opacity-0",
          world && "-translate-y-24",
        )}
      >
        <p className="flex gap-6 tabular-nums">
          <span>
            Cursor <span ref={x}>0000</span> / <span ref={y}>0000</span>
          </span>
          <span>
            Scroll vel <span ref={vel}>00.00</span> <span ref={bar}>{meter(0)}</span>
          </span>
          {!coarse && <Signal />}
        </p>
        <p className="flex gap-6 tabular-nums">
          {info ? <span>Current world {info.index}</span> : null}
          {/* zone + time are client-only: ICU data can name the zone differently on server and browser */}
          <span ref={time} />
          <span>Build {site.build}</span>
        </p>
      </div>
      <Toasts raised={!!world} />
    </>
  );
}

/** Chaos variant: the HUD starts picking up stray signals (data/site.ts → signals). */
function Signal() {
  const chaos = useChaos();
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!chaos || reduced) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % site.signals.length), 2200);
    return () => window.clearInterval(id);
  }, [chaos, reduced]);

  // lg+: below that both corners together already fill the width
  return chaos ? <Scramble text={`RX ${site.signals[i]}`} trigger="change" duration={0.6} className="hidden lg:inline" /> : null;
}
