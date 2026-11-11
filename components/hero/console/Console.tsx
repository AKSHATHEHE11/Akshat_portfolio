"use client";
// The console stage: a transparent canvas that bleeds to the viewport edge (so the cable can leave
// the frame), an anchor box that decides where the device sits, the SVG stand-in, and the DOM controls.
import "./console.css";
import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { preload } from "react-dom";
import { useChaos, useCoarse, useMediaQuery, useOnScreen, useReducedMotion, useTheme } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { emit, system } from "@/lib/system";
import { clamp, cn } from "@/lib/utils";
import { Controls, type Box } from "./Controls";
import { land } from "../land";
import { POSTER_RECTS } from "./poster";
import { MODEL, type ControlId, type KeyId, type Mode, type Rig } from "./rig";
import { Silhouette } from "./Silhouette";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

function hasWebGL() {
  try {
    const gl = document.createElement("canvas").getContext("webgl2") ?? document.createElement("canvas").getContext("webgl");
    gl?.getExtension("WEBGL_lose_context")?.loseContext(); // hand the context back; the scene makes its own
    return !!gl;
  } catch {
    return false;
  }
}

/** A failed model fetch, chunk or GL context falls back to the SVG console instead of taking the page down. */
class Guard extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function Console({ rig }: { rig: Rig }) {
  const stage = useRef<HTMLDivElement>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(stage, "160px");
  const reduced = useReducedMotion();
  const coarse = useCoarse();
  const chaos = useChaos();
  const dark = useTheme() === "dark";
  const [gl, setGl] = useState<"pending" | "ok" | "none">("pending");
  const [live, setLive] = useState(false);
  const [mode, setMode] = useState<Mode>("idle");
  const [knob, setKnob] = useState(rig.knob);
  // Once the 3D console has faded in, the SVG stand-in leaves rendering entirely (display:none).
  // Kept merely invisible, its ~100 shapes were restyled every frame along with the hero.
  const [standInGone, setStandInGone] = useState(false);
  useEffect(() => {
    if (!live) {
      setStandInGone(false);
      return;
    }
    const id = window.setTimeout(() => setStandInGone(true), 450);
    return () => window.clearTimeout(id);
  }, [live]);

  // The 3D starts loading as soon as the page is live; it is never held back. Until its first frame, the
  // poster (a photograph of this same scene at rest) holds the spot, so nothing visibly changes when the
  // live console takes over. The model itself is already on its way: preloaded from the page head.
  preload(MODEL, { as: "fetch", crossOrigin: "anonymous" });
  useEffect(() => setGl(hasWebGL() ? "ok" : "none"), []);
  // The 3D falls with the stand-in: hero.css drops it from 1.5 anchor heights up on --hero-land (land.ts),
  // 0.4s delay, 1.3s. Timed off the CSS animation's start on the document timeline, so it keeps going
  // after the stand-in is hidden; the attribute check also hides the device behind the boot screen and
  // resets for a RESTART. Settled once landed: no per-frame lookups after the entrance.
  const drop = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let start: number | null = null;
    let settled = false;
    rig.fall = () => {
      const h = rig.anchor?.h ?? 0;
      if (document.documentElement.dataset.booted !== "1") {
        start = null;
        settled = false;
        return rig.reduced ? 0 : -1.5 * h;
      }
      if (settled) return 0;
      if (start === null) {
        const a = drop.current?.getAnimations().find((x) => (x as CSSAnimation).animationName === "hero-drop");
        if (!a || a.startTime === null) {
          settled = true; // reduced motion, or the fall finished before the 3D arrived
          return 0;
        }
        start = Number(a.startTime);
      }
      const p = (Number(document.timeline.currentTime) - start - 400) / 1300;
      if (p >= 1) {
        settled = true;
        return 0;
      }
      return -1.5 * h * (1 - land(Math.max(0, p)));
    };
    return () => {
      rig.fall = () => 0;
    };
  }, [rig]);

  // Without WebGL the SVG drawing (with its own interactive screen) stands in for good.
  const poster = gl !== "none";
  const wide = useMediaQuery("(min-width: 64rem)");
  // where the poster's parts sit; dark mode draws the device 5% larger (Scene.tsx), around the box centre
  const posterRects = useMemo(() => {
    const k = dark ? 1.05 : 1;
    const out: Partial<Record<ControlId, Box>> = {};
    for (const [id, r] of Object.entries(POSTER_RECTS[wide ? "wide" : "tall"]) as [ControlId, Box][])
      out[id] = { left: 50 + (r.left - 50) * k, top: 50 + (r.top - 50) * k, width: r.width * k, height: r.height * k };
    return out;
  }, [wide, dark]);

  useEffect(() => {
    rig.chaos = chaos;
    rig.reduced = reduced;
    rig.invalidate();
  }, [rig, chaos, reduced]);

  useEffect(() => {
    const st = stage.current;
    const an = anchor.current;
    if (!st || !an) return;
    const measure = () => {
      const s = st.getBoundingClientRect();
      const a = an.getBoundingClientRect();
      rig.anchor = { x: a.left - s.left, y: a.top - s.top, w: a.width, h: a.height };
      rig.invalidate();
    };
    const ro = new ResizeObserver(measure);
    ro.observe(st);
    ro.observe(an);
    return () => ro.disconnect();
  }, [rig]);

  const onKey = useCallback(
    (key: KeyId) => {
      const next: Mode = rig.mode === key ? "idle" : key;
      const now = performance.now();
      rig.mode = next;
      rig.modeAt = now;
      rig.pressed[key] = now;
      setMode(next);
      play("press");
      emit("console:key", { key });
      rig.invalidate();
    },
    [rig],
  );

  const refresh = useRef(0);
  const onTune = useCallback(
    (value: number) => {
      const v = clamp(value);
      if (Math.round(v * 24) !== Math.round(rig.knob * 24)) play("tick");
      rig.knob = v;
      rig.knobAt = performance.now();
      setKnob(v);
      rig.invalidate();
      // demand frameloop (reduced motion): one more frame once the TUNE readout has timed out
      window.clearTimeout(refresh.current);
      refresh.current = window.setTimeout(() => rig.invalidate(), 1150);
    },
    [rig],
  );

  // Stable, so knob/mode state changes here never re-render the Canvas (drei's Environment
  // re-captures its cube map on every re-render).
  const onReady = useCallback(() => {
    rig.hover = null; // a hover that began on the SVG stand-in must not stick to a 3D key
    rig.down = null;
    setLive(true);
  }, [rig]);
  const onLost = useCallback(() => {
    setLive(false);
    setGl("none");
  }, []);

  const onChaos = useCallback(() => {
    const next = !system.get().chaos;
    system.toggleChaos(next);
    play(next ? "toggle-on" : "toggle-off");
    const el = rig.els.switch;
    if (next && el) {
      const r = el.getBoundingClientRect();
      emit("chaos:burst", { x: r.left + r.width / 2, y: r.top + r.height / 2 });
    }
  }, [rig]);

  const controls = (projected: boolean) => (
    <Controls
      rig={rig}
      projected={projected}
      rects={!projected && poster ? posterRects : undefined}
      mode={mode}
      knob={knob}
      chaos={chaos}
      onKey={onKey}
      onTune={onTune}
      onChaos={onChaos}
    />
  );

  return (
    <div
      ref={stage}
      data-console
      className={cn(
        "relative -mx-(--margin) aspect-[1/0.92] overflow-hidden md:aspect-[1/0.66]",
        "lg:absolute lg:-bottom-4 lg:-left-10 lg:top-[calc(-1*var(--hero-top))] lg:right-[calc(-1*var(--bleed))] lg:mx-0 lg:aspect-auto",
      )}
    >
      <div
        ref={anchor}
        className={cn(
          "absolute bottom-[5%] left-(--margin) right-(--margin) top-[16%] [container-type:size]",
          "md:left-[17%] md:right-[17%] md:top-[21%] lg:bottom-12 lg:left-10 lg:right-(--bleed) lg:top-[calc(var(--hero-top)+4.5rem)]",
        )}
      >
        <div
          data-console-fallback
          className={cn(
            "absolute inset-0 m-auto aspect-[2.35/1.85] w-[min(100cqw,calc(100cqh*1.27))] transition-opacity duration-300",
            !poster && "drop-shadow-[0_26px_28px_rgb(40_28_18/0.22)]", // the poster has its real shadow
            live && "pointer-events-none opacity-0",
            standInGone && "hidden",
          )}
        >
          <div ref={drop} data-console-drop className="absolute inset-0">
            {poster ? <div aria-hidden className="hc-poster" /> : <Silhouette mode={mode} chaos={chaos} />}
            {live ? null : controls(false)}
          </div>
        </div>
      </div>
      {gl === "ok" ? (
        <Guard onError={onLost}>
          <Scene
            rig={rig}
            active={onScreen}
            reduced={reduced}
            coarse={coarse}
            dark={dark}
            playing={mode === "play"}
            onReady={onReady}
            onLost={onLost}
          />
        </Guard>
      ) : null}
      {live ? controls(true) : null}
    </div>
  );
}
