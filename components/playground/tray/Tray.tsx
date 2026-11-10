"use client";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type MatterNS from "matter-js";
import { Vibrate } from "lucide-react";
import { ThingView } from "@/components/home/bench/ThingView";
import "@/components/home/bench/bench.css";
import { Button } from "@/components/ui/Button";
import { Led } from "@/components/ui/marks";
import { ignoreShortcut } from "@/components/work/keys";
import { useChaos, useCoarse, useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { on, useSystem } from "@/lib/system";
import { cn } from "@/lib/utils";
import { lab } from "../lab";
import { createTray, type TrayEngine } from "./engine";
import { GRAVITY, TRAY, type Gravity, type TrayThing } from "./things";

const TILT: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

/**
 * The physics tray: a cream parts cabinet with things to throw, a three-way gravity selector and an
 * electromagnet that only cares about steel. matter-js loads when the tray is about a screen away,
 * steps only while it is on screen, and the things rain in the first time it is seen after boot.
 * Reduced motion: no physics — the parts sit sorted against whichever wall gravity points at.
 */
export default function Tray({ near, active }: { near: boolean; active: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLElement | null)[]>([]);
  const engine = useRef<TrayEngine | null>(null);
  /** the grab: pointer id, body index, and the tray box measured at pointerdown (+ scroll then) */
  const press = useRef<{ id: number; i: number; left: number; top: number; scroll: number } | null>(null);
  const reduced = useReducedMotion();
  const chaos = useChaos();
  const coarse = useCoarse();
  const ready = useSystem((s) => s.ready);
  const booted = useSystem((s) => s.booted);
  const [chosen, setChosen] = useState<Gravity>("down");
  const [flip, setFlip] = useState<Gravity>("up");
  const [magnet, setMagnet] = useState(false);
  const [live, setLive] = useState(false);
  const auto = chaos && !reduced;
  const gravity = auto ? flip : chosen;

  // phones get about half the bodies
  const things = useMemo(() => (coarse ? TRAY.filter((t) => t.phone) : TRAY), [coarse]);

  useEffect(() => {
    const el = box.current;
    if (!near || !ready || reduced || !el) return;
    let alive = true;
    let ro: ResizeObserver | undefined;
    let timer = 0;
    const nodes = els.current;
    import("matter-js").then((mod) => {
      if (!alive) return;
      // CJS module: the namespace sits on .default under the bundler's interop
      const Matter = ((mod as { default?: typeof MatterNS }).default ?? mod) as typeof MatterNS;
      const items = things.map((t, i) => ({ t, el: nodes[i] as HTMLElement }));
      const e = createTray(Matter, el, items, { impact: () => play("drop"), clack: () => play("click") });
      engine.current = e;
      setLive(true);
      let size = `${el.clientWidth}x${el.clientHeight}`;
      ro = new ResizeObserver(() => {
        const next = `${el.clientWidth}x${el.clientHeight}`;
        if (next === size) return;
        size = next;
        window.clearTimeout(timer);
        timer = window.setTimeout(() => e.resize(), 160);
      });
      ro.observe(el);
    });
    return () => {
      alive = false;
      ro?.disconnect();
      window.clearTimeout(timer);
      engine.current?.destroy();
      engine.current = null;
      nodes.forEach((n) => n?.style.removeProperty("transform"));
      setLive(false);
    };
  }, [near, ready, reduced, things]);

  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    if (active) e.start();
    else e.stop();
  }, [active, live]);

  useEffect(() => {
    if (live && active && booted) engine.current?.drop();
  }, [live, active, booted]);

  useEffect(() => engine.current?.setGravity(gravity), [gravity, live]);
  useEffect(() => engine.current?.setMagnet(magnet), [magnet, live]);
  useEffect(() => engine.current?.setChaos(chaos), [chaos, live]);

  // chaos: somebody keeps flipping the gravity switch
  useEffect(() => {
    if (!auto || !active) return;
    const id = window.setInterval(() => {
      setFlip((f) => (f === "up" ? "down" : "up"));
      play("toggle-on");
    }, 3200);
    return () => window.clearInterval(id);
  }, [auto, active]);

  // a chaos burst over the tray is a shockwave inside it
  useEffect(
    () =>
      on<{ x: number; y: number }>("chaos:burst", (p) => {
        const r = box.current?.getBoundingClientRect();
        if (r && p && p.y > r.top && p.y < r.bottom) engine.current?.blast(p.x - r.left, p.y - r.top);
      }),
    [],
  );

  // page keys: G cycles gravity, M flips the magnet
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (ignoreShortcut(e)) return;
      const k = e.key.toLowerCase();
      if (k === "g") {
        const i = GRAVITY.findIndex((g) => g.id === chosen);
        pickGravity(GRAVITY[(i + 1) % GRAVITY.length].id);
      } else if (k === "m") toggleMagnet();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function pickGravity(g: Gravity) {
    setChosen(g);
    play("click");
  }
  function toggleMagnet() {
    setMagnet(!magnet);
    play(magnet ? "toggle-off" : "toggle-on");
  }

  // pointer → tray-local px. The box is measured once per grab (never per move); a wheel scroll
  // mid-throw moves it by the scroll delta.
  function onDown(i: number, e: PointerEvent<HTMLElement>) {
    if (e.button !== 0 || press.current || !engine.current) return;
    const r = box.current!.getBoundingClientRect();
    if (!engine.current.hold(i, e.clientX - r.left, e.clientY - r.top)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.dataset.held = "";
    press.current = { id: e.pointerId, i, left: r.left, top: r.top, scroll: lab.scroll };
    play(things[i].kind === "key" ? "press" : "tick");
  }
  function onMove(e: PointerEvent<HTMLElement>) {
    const p = press.current;
    if (p?.id !== e.pointerId) return;
    engine.current?.move(e.clientX - p.left, e.clientY - p.top + lab.scroll - p.scroll);
  }
  function onUp(e: PointerEvent<HTMLElement>) {
    if (press.current?.id !== e.pointerId) return;
    press.current = null;
    delete e.currentTarget.dataset.held;
    engine.current?.release();
  }
  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget || !engine.current) return;
    const t = TILT[e.key];
    if (t) engine.current.tilt(t[0], t[1]);
    else if (e.key === " " || e.key === "Enter") engine.current.shake();
    else return;
    e.preventDefault();
    play("tick");
  }

  const still = reduced || !ready;
  return (
    <div className="pg-tray" data-pg-in>
      <div
        ref={box}
        className="pg-tray-in"
        data-physics={live ? "on" : "off"}
        data-still={still || undefined}
        data-gravity={gravity}
        data-run={active || undefined}
        tabIndex={0}
        role="group"
        aria-label={`Tray. Gravity ${gravity}, magnet ${magnet ? "on" : "off"}. Arrow keys tilt it, Space shakes it.`}
        data-arrows="local"
        onKeyDown={onKey}
      >
        <div aria-hidden className="pg-magnet" data-on={magnet || undefined}>
          <i className="pg-magnet-cable" />
          <span className="pg-magnet-body">
            <i className="pg-magnet-coil" />
            <Led tone="signal" pulse={false} className="pg-magnet-led" />
          </span>
          <i className="pg-magnet-field" />
        </div>
        <div className="pg-things">
          {things.map((t, i) => (
            <span
              key={t.id}
              ref={(el) => {
                els.current[i] = el;
              }}
              aria-hidden
              className={cn("pg-thing", t.kind === "bearing" || t.kind === "washer" ? `pg-${t.kind}` : `bn-${t.kind}`)}
              data-tone={t.tone}
              data-cursor={live ? "drag" : undefined}
              data-cursor-label="THROW"
              style={{ width: `calc(${t.w} * var(--u))`, height: `calc(${t.h} * var(--u))` }}
              onPointerDown={(e) => onDown(i, e)}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              onLostPointerCapture={onUp}
            >
              <View t={t} />
            </span>
          ))}
        </div>
      </div>

      <div className="pg-tray-strip">
        <span className="pg-plate label">Tray 02</span>
        <fieldset className="pg-seg">
          <legend className="sr-only">Gravity</legend>
          {GRAVITY.map((g) => (
            <label key={g.id} data-on={gravity === g.id || undefined}>
              <input type="radio" name="pg-gravity" className="sr-only" checked={chosen === g.id} onChange={() => pickGravity(g.id)} />
              {g.label}
            </label>
          ))}
          {auto ? <span className="pg-seg-auto label">auto</span> : null}
        </fieldset>
        <button type="button" role="switch" aria-checked={magnet} className="pg-switch" onClick={toggleMagnet}>
          <span aria-hidden className="pg-switch-track">
            <i />
          </span>
          <span className="label">Magnet</span>
        </button>
        {!reduced ? (
          <Button variant="key" size="sm" icon={<Vibrate size={14} strokeWidth={1.75} />} onClick={() => engine.current?.shake()} aria-label="Shake the tray">
            Shake
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function View({ t }: { t: TrayThing }) {
  if (t.kind === "bearing") return null; // a CSS sphere
  if (t.kind === "washer") return <i />;
  return <ThingView t={{ ...t, kind: t.kind, d: [0, 0, 0] }} />;
}
