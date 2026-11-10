"use client";
// EXP-06 · ASCII Room. A real-time 3D scene (the site's console, a lit floor, keycaps in orbit) seen
// only through drei's AsciiRenderer. Drag to orbit (sideways swipe on touch), arrow keys too; it
// settles back into a slow turntable. Switched off, it holds its last frame as plain text — and before
// it has ever run, a frame baked from the same scene at the same angle (still.ts).
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { play } from "@/lib/sound";
import { clamp } from "@/lib/utils";
import type { PieceProps } from "../shared";
import type { Orbit } from "./Room";
import { REST, STILL, STILL_COLS, resolution } from "./still";

const Room = dynamic(() => import("./Room"), { ssr: false });

const SENS = 0.0085;
const TURN: Record<string, number> = { ArrowLeft: 1, ArrowRight: -1 };
const TILT: Record<string, number> = { ArrowUp: -1, ArrowDown: 1 };
const PITCH = [0.02, 1.15] as const;

/** AsciiEffect writes "&nbsp;" and "<br>" — back to plain lines */
const toText = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

export default function AsciiRoom({ active, chaos, reduced, coarse }: PieceProps) {
  const host = useRef<HTMLDivElement>(null);
  const still = useRef<HTMLPreElement>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const orbit = useRef<Orbit>({ ...REST, vy: 0, drag: false });
  const last = useRef({ id: -1, x: 0, y: 0, t: 0 });
  // the character grid follows the box (fullscreen, rotation); quantised, so most resizes keep it
  const [res, setRes] = useState(() => resolution(coarse));

  useEffect(() => {
    if (still.current && !still.current.textContent) still.current.textContent = STILL;
  }, []);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setRes(resolution(coarse, e.contentRect.width, e.contentRect.height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [coarse]);

  // switching off: the last live frame becomes the still, at the size it was drawn
  useEffect(() => {
    const pre = still.current;
    const el = host.current;
    if (!active) return;
    return () => {
      const table = tableRef.current;
      const td = table?.rows[0]?.cells[0];
      if (table && td && pre) {
        const text = toText(td.innerHTML);
        pre.textContent = text;
        pre.style.setProperty("--cols", String(text.indexOf("\n")));
        pre.style.setProperty("--fs", table.style.fontSize);
      }
      tableRef.current = null;
      if (el) delete el.dataset.live;
    };
  }, [active]);

  const onReady = useCallback(() => {
    if (host.current) host.current.dataset.live = "1";
  }, []);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    last.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp };
    orbit.current.drag = true;
    orbit.current.vy = 0;
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const L = last.current;
    const o = orbit.current;
    if (!o.drag || e.pointerId !== L.id) return;
    const dx = e.clientX - L.x;
    const dy = e.clientY - L.y;
    const dt = Math.max(8, e.timeStamp - L.t) / 1000;
    o.yaw -= dx * SENS;
    o.pitch = clamp(o.pitch + dy * SENS, ...PITCH);
    o.vy = o.vy * 0.4 + ((-dx * SENS) / dt) * 0.6;
    last.current = { id: L.id, x: e.clientX, y: e.clientY, t: e.timeStamp };
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== last.current.id) return;
    const o = orbit.current;
    o.drag = false;
    // a release after holding still should not fling
    if (reduced || e.timeStamp - last.current.t > 90) o.vy = 0;
    last.current.id = -1;
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const o = orbit.current;
    const turn = TURN[e.key];
    const tilt = TILT[e.key];
    if (!turn && !tilt) return;
    e.preventDefault();
    if (turn) {
      if (reduced) o.yaw += turn * 0.35;
      else o.vy = turn * 2.4;
    }
    if (tilt) o.pitch = clamp(o.pitch + tilt * 0.15, ...PITCH);
    play("tick");
  };

  return (
    <div
      ref={host}
      tabIndex={0}
      role="application"
      aria-roledescription="3D scene"
      aria-label="ASCII room: a small console rendered in characters. Drag, or use the arrow keys, to orbit."
      data-arrows="local"
      data-swipe="local"
      data-cursor={coarse ? undefined : "drag"}
      data-cursor-label="ORBIT"
      className="xp-ascii"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onLostPointerCapture={up}
      onKeyDown={onKey}
    >
      <pre ref={still} aria-hidden className="xp-ascii-still" style={{ "--cols": STILL_COLS, "--fs": `${2 / resolution(false)}px` } as CSSProperties} />
      {active && <Room orbit={orbit} host={host} tableRef={tableRef} resolution={res} chaos={chaos} reduced={reduced} onReady={onReady} />}
      <p aria-hidden className="xp-ascii-hint label">
        {coarse ? "Swipe sideways to orbit" : "Drag to orbit · ← →"}
      </p>
    </div>
  );
}
