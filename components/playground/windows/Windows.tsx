"use client";
import { useCallback, useEffect, useRef } from "react";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { gsap, useGSAP } from "@/lib/gsap";
import { useChaos, useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { clamp } from "@/lib/utils";
import { Accent } from "./Accent";
import { Fragment } from "./Fragment";
import { Synth } from "./Synth";
import { TypeTester } from "./TypeTester";

if (typeof window !== "undefined") gsap.registerPlugin(Draggable, InertiaPlugin);

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * Four paper windows on the mat. Drag a bar to move one (thrown windows coast to a stop), press
 * anywhere on a window to bring it forward, arrows on a focused grip to nudge it. Bounds are the
 * whole mat. Chaos: every couple of seconds one of them slides off somewhere on its own.
 */
export default function Windows({ near, active, bounds }: { near: boolean; active: boolean; bounds: HTMLElement | null }) {
  const root = useRef<HTMLDivElement>(null);
  const drags = useRef<Record<string, Draggable>>({});
  const z = useRef(4);
  const reduced = useReducedMotion();
  const chaos = useChaos();

  const front = useCallback((id: string) => {
    const host = root.current;
    const el = host?.querySelector<HTMLElement>(`[data-win="${id}"]`);
    if (!host || !el || el.dataset.top !== undefined) return;
    host.querySelectorAll("[data-top]").forEach((n) => n.removeAttribute("data-top"));
    el.dataset.top = "";
    el.style.zIndex = String(++z.current);
  }, []);

  useGSAP(
    () => {
      const host = root.current;
      if (!near || !bounds || !host) return;
      const map: Record<string, Draggable> = {};
      host.querySelectorAll<HTMLElement>("[data-win]").forEach((el) => {
        const id = el.dataset.win!;
        [map[id]] = Draggable.create(el, {
          type: "x,y",
          trigger: el.querySelector<HTMLElement>("[data-grip]")!,
          bounds,
          inertia: !reduced,
          edgeResistance: 0.85,
          dragClickables: true,
          zIndexBoost: false,
          onPress() {
            front(id);
            el.dataset.dragging = "";
            gsap.killTweensOf(el);
            play("tick");
          },
          onRelease() {
            delete el.dataset.dragging;
          },
          onThrowComplete() {
            play("drop");
          },
        });
      });
      drags.current = map;
      return () => {
        Object.values(map).forEach((d) => d.kill());
        drags.current = {};
      };
    },
    { scope: root, dependencies: [near, bounds, reduced], revertOnUpdate: true },
  );

  // chaos: one window at a time wanders off (inside the mat) and leans a little
  useEffect(() => {
    if (!chaos || reduced || !active || !bounds) return;
    const id = window.setInterval(() => {
      const free = Object.values(drags.current).filter((d) => !d.isDragging && !d.isThrowing);
      const d = free[Math.floor(Math.random() * free.length)];
      if (!d) return;
      d.applyBounds(bounds);
      gsap.to(d.target, {
        x: clamp(d.x + rand(-200, 200), d.minX, d.maxX),
        y: clamp(d.y + rand(-110, 110), d.minY, d.maxY),
        rotation: rand(-3, 3),
        duration: 1.5,
        ease: "power3.out",
        onComplete: () => void d.update(),
      });
    }, 2200);
    return () => {
      window.clearInterval(id);
      Object.values(drags.current).forEach((d) => gsap.to(d.target, { rotation: 0, duration: 0.6, ease: "power3.out" }));
    };
  }, [chaos, reduced, active, bounds]);

  const nudge = useCallback(
    (id: string, dx: number, dy: number) => {
      const d = drags.current[id];
      if (!d) return;
      front(id);
      gsap.set(d.target, { x: d.x + dx, y: d.y + dy });
      d.update(true);
      play("tick");
    },
    [front],
  );
  const chrome = { onFront: front, onNudge: nudge };

  return (
    <div ref={root} className="pg-wins" data-pg-in>
      <TypeTester chrome={chrome} />
      <Synth chrome={chrome} />
      <Accent chrome={chrome} />
      <Fragment chrome={chrome} active={active} />
    </div>
  );
}
