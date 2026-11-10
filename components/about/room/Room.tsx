"use client";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { profile } from "@/data/profile";
import { site } from "@/data/site";
import { useRise } from "@/components/home/worlds/useRise";
import { gsap, useGSAP } from "@/lib/gsap";
import { useChaos, useCoarse, useMediaQuery, useOnScreen, useReducedMotion, useSystemReady } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { useSystem } from "@/lib/system";
import { cn, pad, seeded } from "@/lib/utils";
import { DESK, FLOOR_DOTS, SCENE } from "./art";
import { OBJECTS, type ObjectId } from "./objects";
import { Panel } from "./Panel";
import { useTilt } from "./useTilt";

const VIEW = `${SCENE.x} ${SCENE.y} ${SCENE.w} ${SCENE.h}`;
const LAST = profile.name.slice(profile.short.length).trim();
const MODEL = profile.spec.find((s) => s.key === "Model")?.value ?? profile.initials;

/** the last exhibit on phones when the count is odd */
const lone = (i: number) => i === OBJECTS.length - 1 && OBJECTS.length % 2 === 1;

/** zero-gravity parameters for chaos, one set per object (deterministic for SSR) */
const FLOAT = OBJECTS.map((_, i) => {
  const r = (k: number) => seeded(i * 17 + k);
  return {
    "--fd": `${(4.6 + r(1) * 3).toFixed(2)}s`,
    "--fdel": `${(-r(2) * 6).toFixed(2)}s`,
    "--fy": `${(-34 - r(3) * 70).toFixed(0)}px`,
    "--fx": `${((r(4) - 0.5) * 36).toFixed(0)}px`,
    "--fr": `${((r(5) - 0.5) * 22).toFixed(1)}deg`,
  };
});

/**
 * THE ROOM — Akshat as a desk. Every object is a button: hover/focus draws its technical callout,
 * click/Enter opens its panel. Desktop: an isometric desk that tilts with the cursor. Phones: the
 * same objects as a stacked exhibit grid with placards. Chaos: gravity switches off.
 */
export function Room() {
  const root = useRef<HTMLElement>(null);
  const head = useRef<HTMLHeadingElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const floor = useRef<SVGSVGElement>(null);
  const btns = useRef<Partial<Record<ObjectId, HTMLButtonElement | null>>>({});
  const [open, setOpen] = useState<ObjectId | null>(null);
  const [hot, setHot] = useState<ObjectId | null>(null);
  const wide = useMediaQuery("(min-width: 1024px)");
  const reduced = useReducedMotion();
  const coarse = useCoarse();
  const chaos = useChaos();
  const ready = useSystemReady();
  const booted = useSystem((s) => s.booted);
  const visible = useOnScreen(root, "0px");
  useRise(head);
  useTilt(stage, floor, visible && ready && !coarse && !reduced);

  const lit = hot ?? open;
  const picked = OBJECTS.find((o) => o.id === open) ?? null;

  // desk assembles once the boot sequence is done (and again after RESTART replays it)
  useGSAP(
    () => {
      if (reduced) return;
      const q = gsap.utils.selector(root);
      const bodies = q(".ab-obj-body");
      const shadows = q(".ab-obj-shadow");
      const desk = q(".ab-desk, .ab-floor");
      const tags = q(".ab-tag, .ab-leaders");
      const all = [...bodies, ...shadows, ...desk, ...tags];
      gsap.set(all, { autoAlpha: 0 });
      const run = () =>
        gsap
          .timeline({ delay: 0.25, onComplete: () => gsap.set(bodies, { clearProps: "transform" }) })
          .fromTo(desk, { autoAlpha: 0, y: 34 }, { autoAlpha: 1, y: 0, duration: 1, ease: "expo.out", clearProps: "transform" })
          .fromTo(bodies, { autoAlpha: 0, y: -110 }, { autoAlpha: 1, y: 0, duration: 0.75, stagger: 0.075, ease: "back.out(1.5)" }, 0.3)
          .fromTo(shadows, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, stagger: 0.075 }, 0.45)
          .call(() => play("drop"), [], 0.95)
          .fromTo(tags, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, stagger: 0.03 }, 1.1);
      if (!ready) return; // system not initialised yet: stay assembled-off, decide on the next pass
      if (booted) return void run();
      gsap.delayedCall(8, run); // boot overlay is up; never leave the desk empty if it hangs
    },
    { scope: root, dependencies: [ready, booted, reduced], revertOnUpdate: true },
  );

  // Chaos: gravity off — objects lift off and bob (CSS, keyed to data-float on the section). Chaos off:
  // catch each object where it hangs and let it fall back onto the desk.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (chaos && !reduced) {
      el.dataset.float = "";
      return;
    }
    if (el.dataset.float === undefined) return;
    const floats = gsap.utils.toArray<HTMLElement>(".ab-obj-float", el);
    const hang = floats.map((f) => getComputedStyle(f).transform);
    delete el.dataset.float;
    if (reduced) return;
    floats.forEach((f, i) => {
      if (hang[i] === "none") return;
      gsap.set(f, { transform: hang[i] });
      gsap.to(f, { x: 0, y: 0, rotation: 0, duration: 0.9, delay: i * 0.05, ease: "bounce.out", clearProps: "transform" });
    });
    gsap.delayedCall(0.5, () => play("drop"));
  }, [chaos, reduced]);

  const pick = useCallback((id: ObjectId) => {
    setOpen((cur) => {
      if (cur === id) {
        play("close");
        return null;
      }
      play(cur ? "click" : "open");
      return id;
    });
  }, []);

  const close = useCallback(() => {
    const panel = document.getElementById("ab-panel");
    const id = open;
    play("close");
    setOpen(null);
    // the wide panel is non-modal: if focus was inside it, hand it back to the object it came from
    if (id && panel?.contains(document.activeElement)) btns.current[id]?.focus({ preventScroll: true });
  }, [open]);

  const leave = (id: ObjectId) => setHot((h) => (h === id ? null : h));

  return (
    <section ref={root} id="desk" data-rail="Desk" aria-labelledby="ab-title" className="ab-room relative overflow-clip">
      <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
        <defs>
          <radialGradient id="ab-soft">
            <stop offset="0.35" stopColor="#111" stopOpacity="0.2" />
            <stop offset="1" stopColor="#111" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ab-lampglow">
            <stop offset="0" stopColor="#ff8a4c" stopOpacity="0.5" />
            <stop offset="0.45" stopColor="#ffb25c" stopOpacity="0.16" />
            <stop offset="1" stopColor="#ffb25c" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ab-cloudlight" cx="0.5" cy="0.62" r="0.62">
            <stop offset="0" stopColor="#fff1c9" />
            <stop offset="0.6" stopColor="#ffe1b0" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffd9a3" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>

      <div className="frame grid min-h-svh gap-y-6 pt-[calc(var(--nav-h)+clamp(1.25rem,4vh,3rem))] pb-[clamp(3rem,8vh,5rem)] lg:grid-cols-12 lg:gap-x-(--gutter)">
        <div className="relative flex flex-col lg:col-span-5">
          <h1 ref={head} id="ab-title" data-chaos-type className="text-[clamp(4.5rem,1rem+9vw,10rem)]">
            <span className="block overflow-clip pb-[0.04em]">
              <span data-rise className="display block" style={{ fontVariationSettings: '"wdth" 72' }}>
                {profile.short}
              </span>
            </span>
            <span className="-mt-[0.08em] block overflow-clip pr-[0.12em] pb-[0.14em]">
              <span data-rise className="serif-accent block leading-[0.92]">
                {LAST}
              </span>
            </span>
          </h1>
          <p className="mt-4 max-w-[30ch] text-lede leading-snug text-fg-muted">
            Nothing on this desk is decoration. <span className="text-fg">Pick something up.</span>
          </p>

          {/* the drawing's parts list (mouse convenience; the objects themselves are the buttons) */}
          <div aria-hidden className="mt-auto hidden pt-10 lg:block">
            <p className="label flex justify-between border-b border-line-strong pb-2 text-fg-muted">
              <span>Parts</span>
              <span>{pad(OBJECTS.length)}</span>
            </p>
            <ol>
              {OBJECTS.map((o) => (
                <li
                  key={o.id}
                  data-on={lit === o.id || undefined}
                  data-cursor="open"
                  className="ab-part"
                  onPointerEnter={() => setHot(o.id)}
                  onPointerLeave={() => leave(o.id)}
                  onClick={() => pick(o.id)}
                >
                  <span className="font-mono text-[0.75rem] tabular-nums">{o.n}</span>
                  <span className="truncate">{o.name}</span>
                  <span className="ab-part-dots" />
                  <span className="font-medium">{o.topic}</span>
                </li>
              ))}
            </ol>
            <p className="label mt-3 flex justify-between text-fg-muted">
              <span>Dwg {MODEL}</span>
              <span>Rev {site.build}</span>
            </p>
          </div>

          <Panel obj={picked} wide={wide} onClose={close} onPick={setOpen} />
        </div>

        <div className="lg:col-span-7 lg:self-center">
          <div
            ref={stage}
            className="ab-stage"
            data-open={open ? "" : undefined}
            style={{ "--ar": `${SCENE.w} / ${SCENE.h}` } as CSSProperties}
          >
            <svg ref={floor} viewBox={VIEW} className="ab-floor" aria-hidden>
              <path d={FLOOR_DOTS} fill="currentColor" />
            </svg>
            <svg viewBox={VIEW} className="ab-desk" aria-hidden onClick={() => open && close()}>
              {DESK.art}
            </svg>

            {OBJECTS.map((o, i) => (
              <button
                key={o.id}
                ref={(el) => {
                  btns.current[o.id] = el;
                }}
                type="button"
                className="ab-obj"
                style={
                  {
                    "--l": o.place.left,
                    "--t": o.place.top,
                    "--w": o.place.width,
                    "--h": o.place.height,
                    // the odd one out spans both columns: keep it at the same scale as the rest (≈ half the row)
                    "--pw": lone(i) ? `calc(${o.phone} * 0.62)` : o.phone,
                    "--oar": `${o.box.w} / ${o.box.h}`,
                    "--span": lone(i) ? "span 2" : undefined,
                    ...FLOAT[i],
                  } as CSSProperties
                }
                data-state={open === o.id ? "open" : open ? "dim" : undefined}
                data-hot={lit === o.id || undefined}
                data-cursor="open"
                data-cursor-label="OPEN"
                aria-label={`${o.n}, ${o.name}: ${o.topic}`}
                aria-expanded={open === o.id}
                aria-controls={open === o.id ? "ab-panel" : undefined}
                onPointerEnter={(e) => {
                  if (e.pointerType !== "mouse") return;
                  setHot(o.id);
                  play("tick");
                }}
                onPointerLeave={() => leave(o.id)}
                onFocus={() => setHot(o.id)}
                onBlur={() => leave(o.id)}
                onClick={() => pick(o.id)}
              >
                <span className="ab-obj-art">
                  <svg viewBox={`${o.box.x} ${o.box.y} ${o.box.w} ${o.box.h}`} className="ab-obj-shadow" aria-hidden>
                    {o.art.shadow}
                  </svg>
                  <span className="ab-obj-body">
                    <span className="ab-obj-float">
                      <svg viewBox={`${o.box.x} ${o.box.y} ${o.box.w} ${o.box.h}`} aria-hidden>
                        {o.art.body}
                      </svg>
                    </span>
                  </span>
                </span>
                <span className="ab-placard">
                  <span className="font-mono text-[0.6875rem] tabular-nums text-fg-muted">{o.n}</span>
                  <span className="block text-[0.9375rem] font-semibold leading-tight">{o.topic}</span>
                  <span className="block text-[0.8125rem] leading-tight text-fg-muted">{o.name}</span>
                </span>
              </button>
            ))}

            {/* technical callouts: balloons always, leader + label for the lit object */}
            <svg viewBox={VIEW} className="ab-leaders" aria-hidden>
              {OBJECTS.map((o) => (
                <g key={o.id} data-on={lit === o.id || undefined}>
                  <line {...o.leader} vectorEffect="non-scaling-stroke" />
                  <circle cx={o.leader.x1} cy={o.leader.y1} r={2.6} />
                </g>
              ))}
            </svg>
            {OBJECTS.map((o) => (
              <span
                key={o.id}
                aria-hidden
                className={cn("ab-tag", o.side !== "r" && `ab-tag-${o.side}`)}
                data-on={lit === o.id || undefined}
                style={o.elbow}
              >
                <span className="ab-balloon">{o.n}</span>
                <span className="ab-tag-text">
                  <span className="label block text-fg-muted">{o.name}</span>
                  <span className="block text-[1.0625rem] font-semibold leading-tight">{o.topic}</span>
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
