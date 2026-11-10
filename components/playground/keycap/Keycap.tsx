"use client";
import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { ThingView } from "@/components/home/bench/ThingView";
import "@/components/home/bench/bench.css";
import { useChaos, useCoarse, useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { pad } from "@/lib/utils";
import { createRig, legendFor } from "./rig";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

function hasWebGL() {
  try {
    const gl = document.createElement("canvas").getContext("webgl2") ?? document.createElement("canvas").getContext("webgl");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

/** A failed model, chunk or GL context leaves the CSS keycap in charge instead of breaking the page. */
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

/**
 * One sculpted Cherry-profile keycap (public/models/keycap.glb). Drag sideways to spin it (it coasts,
 * then settles back facing you), tap to press it. Focus it and type: the legend becomes your key.
 * Reduced motion or no WebGL: the bench's CSS keycap, which presses and changes legend just the same.
 */
export default function Keycap({ near, active, gen }: { near: boolean; active: boolean; gen: number }) {
  const reduced = useReducedMotion();
  const coarse = useCoarse();
  const chaos = useChaos();
  const rig = useMemo(() => createRig(), []);
  const [gl, setGl] = useState<"pending" | "ok" | "none">("pending");
  const [live, setLive] = useState(false);
  const [legend, setLegend] = useState(rig.legend);
  const [presses, setPresses] = useState(0);
  const [down, setDown] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number; lx: number; ly: number; t: number; lt: number; moved: boolean } | null>(null);
  const upTimer = useRef(0);

  useEffect(() => setGl(hasWebGL() ? "ok" : "none"), []);
  useEffect(() => {
    rig.chaos = chaos;
  }, [rig, chaos]);

  // reset bench: spin home, blank legend, counter to zero (the GL context stays)
  useEffect(() => {
    if (!gen) return;
    rig.vyaw = 0;
    rig.legend = "A";
    rig.pitchTarget = 0;
    setLegend("A");
    setPresses(0);
  }, [gen, rig]);

  const press = useCallback(() => {
    rig.press = performance.now();
    play("press");
    setPresses((n) => n + 1);
    setDown(true);
    window.clearTimeout(upTimer.current);
    upTimer.current = window.setTimeout(() => setDown(false), 120);
  }, [rig]);

  const onDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || drag.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const now = e.timeStamp;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: now, lt: now, moved: false };
    rig.drag = true;
    rig.vyaw = 0;
  };
  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.lx;
    const dy = e.clientY - d.ly;
    const dt = Math.max(8, e.timeStamp - d.lt) / 1000;
    d.lx = e.clientX;
    d.ly = e.clientY;
    d.lt = e.timeStamp;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) d.moved = true;
    if (!d.moved) return;
    rig.yaw += dx * 0.013;
    rig.vyaw = rig.vyaw * 0.5 + ((dx * 0.013) / dt) * 0.5;
    rig.pitchTarget = Math.max(-0.45, Math.min(0.55, rig.pitchTarget + dy * 0.006));
  };
  const onUp = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    rig.drag = false;
    rig.pitchTarget = 0;
    if (e.type === "pointerup" && !d.moved && e.timeStamp - d.t < 500) press();
    if (e.timeStamp - d.lt > 80) rig.vyaw = 0; // held still before letting go: no fling
  };

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.key === "Tab" || e.key === "Escape") return;
    e.preventDefault();
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      rig.vyaw += e.key === "ArrowLeft" ? -2.4 : 2.4;
      play("tick");
      return;
    }
    if (e.key === "ArrowUp" || e.key === "ArrowDown") return;
    if (e.repeat) return;
    const l = legendFor(e.key);
    if (l) {
      rig.legend = l;
      setLegend(l);
    }
    press();
  };

  const scene = gl === "ok" && near && !reduced;
  return (
    <div className="pg-keycap" data-pg-in>
      <button
        type="button"
        className="pg-keycap-stage"
        aria-label={`Keycap, legend ${legend}. Press Enter or Space to press it, type any key to make it that key, arrow keys spin it.`}
        data-cursor="drag"
        data-cursor-label="SPIN"
        data-arrows="local"
        data-live={live || undefined}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onLostPointerCapture={onUp}
        onKeyDown={onKey}
      >
        <span aria-hidden className="pg-keycap-css bn-key" data-tone="cream" data-held={down || undefined}>
          <ThingView t={{ id: "pg", kind: "key", char: legend, w: 96, h: 96, shape: "box", d: [0, 0, 0] }} />
        </span>
        {scene ? (
          <Guard onError={() => setGl("none")}>
            <Scene rig={rig} active={active} coarse={coarse} onReady={() => setLive(true)} onLost={() => setGl("none")} />
          </Guard>
        ) : null}
      </button>
      <p className="pg-keycap-plate">
        <span className="label">Cherry R3 · PBT</span>
        <span className="label">
          Legend <b>{legend}</b>
        </span>
        <span className="label" aria-live="polite">
          Presses <b>{pad(presses, 4)}</b>
        </span>
      </p>
    </div>
  );
}
