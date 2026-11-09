"use client";
import { useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { Vibrate } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useChaos, useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { emit, useSystem } from "@/lib/system";
import { Ruler } from "./bench/Ruler";
import { ThingView } from "./bench/ThingView";
import { THINGS, WORD } from "./bench/things";
import { useBench } from "./bench/useBench";
import { useRise } from "./worlds/useRise";
import "./bench/bench.css";

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 0.4],
};

/**
 * PLAY — a physics workbench. Objects drop in when the bench scrolls into view; drag and throw
 * them, double-tap a keycap to type it into the little CRT. Type the word and the bench cheers.
 */
export default function Bench() {
  const root = useRef<HTMLElement>(null);
  const floor = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLHeadingElement>(null);
  const els = useRef<(HTMLElement | null)[]>([]);
  const reduced = useReducedMotion();
  const chaos = useChaos();
  const booted = useSystem((st) => st.booted);
  const { bench, live } = useBench({ root, floor, els, reduced, chaos, booted });
  useRise(head);

  const [screen, setScreen] = useState("");
  const [ok, setOk] = useState(false);
  const buffer = useRef("");
  const lit = useRef<number[]>([]);
  const okTimer = useRef(0);
  const press = useRef<{ id: number; i: number; x: number; y: number; t: number } | null>(null);
  const lastTap = useRef({ i: -1, t: 0 });

  const local = (e: PointerEvent) => {
    const r = root.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };

  function type(i: number) {
    const el = els.current[i];
    const ch = THINGS[i].char;
    if (!el || !ch) return;
    el.dataset.lit = "";
    window.clearTimeout(lit.current[i]);
    lit.current[i] = window.setTimeout(() => delete el.dataset.lit, 650);
    play("type");
    buffer.current = (buffer.current + ch).slice(-5);
    setScreen(buffer.current);
    if (!buffer.current.endsWith(WORD)) return;
    buffer.current = "";
    setScreen(WORD);
    bench.current?.hop();
    play("success");
    emit("toast", { text: `INPUT ACCEPTED: ${WORD}` });
    setOk(true);
    window.clearTimeout(okTimer.current);
    okTimer.current = window.setTimeout(() => {
      setOk(false);
      setScreen("");
    }, 2800);
  }

  function onDown(i: number, e: PointerEvent<HTMLElement>) {
    if (e.button !== 0 || press.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.dataset.held = "";
    press.current = { id: e.pointerId, i, x: e.clientX, y: e.clientY, t: e.timeStamp };
    const [x, y] = local(e);
    bench.current?.hold(i, x, y);
    play(THINGS[i].kind === "key" ? "press" : "tick");
  }

  function onMove(e: PointerEvent<HTMLElement>) {
    if (press.current?.id !== e.pointerId) return;
    const [x, y] = local(e);
    bench.current?.move(x, y);
  }

  function onUp(e: PointerEvent<HTMLElement>) {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    press.current = null;
    delete e.currentTarget.dataset.held;
    bench.current?.release();
    const now = e.timeStamp;
    const tap = e.type === "pointerup" && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 10 && now - p.t < 350;
    if (!tap) return;
    if (lastTap.current.i === p.i && now - lastTap.current.t < 400) {
      lastTap.current.i = -1;
      if (THINGS[p.i].kind === "key") type(p.i);
    } else lastTap.current = { i: p.i, t: now };
  }

  function onKey(i: number, e: KeyboardEvent<HTMLElement>) {
    const dir = ARROWS[e.key];
    // no physics (reduced motion, or not loaded yet): leave the arrows to the page
    if (!dir || !bench.current) return;
    e.preventDefault();
    bench.current?.nudge(i, dir[0], dir[1]);
    play("tick");
  }

  return (
    <section
      ref={root}
      id="play"
      data-rail="Play"
      data-physics={live ? "on" : "off"}
      className="bn-root relative isolate overflow-clip border-t border-line"
    >
      <div aria-hidden className="bn-peg" />

      {/* no z-index on the row: the heading sits under thrown objects, the buttons above them
          (zero-g chaos must never park a cube on the way out) */}
      <div className="frame relative flex flex-col gap-6 pt-[calc(var(--nav-h)+clamp(1rem,3vw,2.75rem))] md:flex-row md:items-end md:justify-between">
        <h2 ref={head} data-chaos-type className="relative z-[2] text-display-m">
          <span className="block overflow-clip pb-[0.06em]">
            <span data-rise className="display block">
              Please touch
            </span>
          </span>
          <span className="-mt-[0.06em] block overflow-clip pr-[0.15em] pb-[0.14em]">
            <span data-rise className="serif-accent block leading-[0.9]">
              the exhibits.
            </span>
          </span>
        </h2>

        <div className="relative z-[4] flex flex-wrap items-center gap-3 md:pb-4">
          {!reduced && (
            <Button
              variant="key"
              size="sm"
              icon={<Vibrate size={14} strokeWidth={1.75} />}
              onClick={() => bench.current?.shake()}
              aria-label="Shake the bench"
            >
              Shake
            </Button>
          )}
          <span className="bn-cta inline-flex rounded-full" data-ok={ok || undefined}>
            <Button href="/playground" variant="ink">
              Enter the playground
            </Button>
          </span>
        </div>
      </div>

      <div className="bn-things">
        {THINGS.map((t, i) => {
          const style = {
            width: `calc(${t.w} * var(--u))`,
            height: `calc(${t.h} * var(--u))`,
            "--x": `${t.d[0]}%`,
            "--lift": t.d[1],
            "--rot": `${t.d[2]}deg`,
            ...(t.m && { "--xm": `${t.m[0]}%`, "--liftm": t.m[1], "--rotm": `${t.m[2]}deg` }),
          } as CSSProperties;
          const shared = {
            ref: (el: HTMLElement | null) => {
              els.current[i] = el;
            },
            className: `bn-thing bn-${t.kind}`,
            style,
            "data-tone": t.tone,
            "data-desktop-only": t.m ? undefined : "",
            onPointerDown: (e: PointerEvent<HTMLElement>) => onDown(i, e),
            onPointerMove: onMove,
            onPointerUp: onUp,
            onPointerCancel: onUp,
            // capture can vanish mid-drag (rebuild/park hides the object): never leave the hand stuck
            onLostPointerCapture: onUp,
          };
          return t.kind === "key" ? (
            <button
              key={t.id}
              type="button"
              {...shared}
              data-cursor={reduced ? "hover" : "drag"}
              data-cursor-label="TAP ×2"
              aria-label={`Key ${t.char}. Enter types it${reduced ? "" : ", arrow keys nudge it"}.`}
              onKeyDown={(e) => onKey(i, e)}
              onClick={(e: MouseEvent) => e.detail === 0 && type(i)}
            >
              <ThingView t={t} />
            </button>
          ) : (
            <div key={t.id} {...shared} aria-hidden data-cursor={reduced ? undefined : "drag"} data-cursor-label="THROW">
              <ThingView t={t} screen={screen} ok={ok} />
            </div>
          );
        })}
      </div>

      <Ruler ref={floor} still={reduced} />
      <p className="sr-only" aria-live="polite">
        {ok ? `${WORD}. Input accepted.` : screen && `Typed ${screen}`}
      </p>
    </section>
  );
}
