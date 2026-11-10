// matter-js world for the tray (side view). The DOM is the renderer: each frame copies body
// position + angle into a transform. Fixed 60 Hz steps on the GSAP ticker, started/stopped with
// visibility. Coordinates are local to the tray's inside. Same grammar as the home bench
// (components/home/bench/physics.ts) plus three gravity settings and an electromagnet.
import type MatterNS from "matter-js";
import { gsap } from "@/lib/gsap";
import { clamp } from "@/lib/utils";
import { GRAVITY, type Gravity, type TrayThing } from "./things";

type M = typeof MatterNS;
type Body = MatterNS.Body;
export interface Item {
  el: HTMLElement;
  t: TrayThing;
}
export type TrayEngine = ReturnType<typeof createTray>;

const STEP = 1000 / 60;
const MAX_V = 36;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pentagon = (r: number) =>
  Array.from({ length: 5 }, (_, k) => {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  });

/** One --u in px for a tray this wide. Must match --u in playground.css (.pg-tray-in). */
export const unitFor = (w: number) => clamp(w / 1000, 0.46, 0.66);
/** The electromagnet hanging from the ceiling, in --u (CSS draws the same box). */
export const MAGNET = { w: 124, h: 50, cable: 18 };

export function createTray(Matter: M, box: HTMLElement, items: Item[], sound: { impact: () => void; clack: () => void }) {
  const { Engine, Bodies, Body, Composite, Constraint, Events, Sleeping } = Matter;
  const engine = Engine.create({ enableSleeping: true, positionIterations: 8, velocityIterations: 6 });
  const world = engine.world;
  // The hand: a spring from the pointer to the grabbed point (MouseConstraint minus its window-wide
  // listeners, which would block page scrolling on touch).
  const hand = Constraint.create({ pointA: { x: 0, y: 0 }, pointB: { x: 0, y: 0 }, length: 0.01, stiffness: 0.2, damping: 0.08 });
  Composite.add(world, hand);

  let W = 0;
  let H = 0;
  let u = 1;
  let walls: Body[] = [];
  let magnetBody: Body | null = null;
  const mag = { x: 0, y: 0 };
  let bodies: (Body | null)[] = items.map(() => null);
  let due: number[] = items.map(() => -1);
  let gravity: Gravity = "down";
  let magnet = false;
  let chaos = false;
  let running = false;
  let dropped = false;
  let clock = 0;
  let acc = 0;
  let nextNudge = 0;

  const dims = (t: TrayThing) => [t.w * u, t.h * u] as const;
  const live = () => bodies.filter((b): b is Body => b !== null);

  function measure() {
    W = box.clientWidth;
    H = box.clientHeight;
    u = unitFor(W);
  }

  function buildWalls() {
    Composite.remove(world, walls);
    const T = 300;
    const o = { isStatic: true, friction: 0.6, restitution: chaos ? 0.9 : 0.25 };
    const mw = MAGNET.w * u;
    const mh = MAGNET.h * u;
    const top = MAGNET.cable * u;
    magnetBody = Bodies.rectangle(W / 2, top + mh / 2, mw, mh, { ...o, chamfer: { radius: 10 * u } });
    mag.x = W / 2;
    mag.y = top + mh + 6 * u;
    walls = [
      Bodies.rectangle(W / 2, H + T / 2, W + T * 2, T, o),
      Bodies.rectangle(W / 2, -T / 2, W + T * 2, T, o),
      Bodies.rectangle(-T / 2, H / 2, T, H + T * 2, o),
      Bodies.rectangle(W + T / 2, H / 2, T, H + T * 2, o),
      magnetBody,
    ];
    Composite.add(world, walls);
  }

  function spawn(i: number) {
    const { t, el } = items[i];
    due[i] = -1;
    const [w, h] = dims(t);
    const x = clamp(rand(0.08, 0.92) * W, w / 2 + 4, W - w / 2 - 4);
    const y =
      gravity === "up" ? H - h / 2 - rand(4, 40) * u : gravity === "zero" ? rand(0.3, 0.75) * H : (MAGNET.cable + MAGNET.h + 30) * u + h / 2;
    const o = {
      angle: rand(-0.5, 0.5),
      restitution: chaos ? 0.85 : 0.28,
      friction: 0.5,
      frictionAir: chaos ? 0.004 : 0.012,
      density: t.metal ? 0.0042 : t.kind === "key" ? 0.003 : 0.0018,
    };
    const b =
      t.shape === "circle"
        ? Bodies.circle(x, y, w / 2, o)
        : t.shape === "hex"
          ? Bodies.polygon(x, y, 6, (w / 2) * 0.98, o)
          : t.shape === "pent"
            ? Bodies.fromVertices(x, y, [pentagon((w / 2) * 0.86)], o)
            : Bodies.rectangle(x, y, w, h, { ...o, chamfer: { radius: (t.r ?? 8) * u } });
    Body.setVelocity(b, { x: rand(-1.5, 1.5), y: gravity === "up" ? -3 : gravity === "zero" ? rand(-1, 1) : 3 });
    Body.setAngularVelocity(b, rand(-0.05, 0.05));
    Composite.add(world, b);
    bodies[i] = b;
    el.removeAttribute("data-parked");
  }

  function guard() {
    for (const b of live()) {
      const { x, y } = b.position;
      if (x < -60 || x > W + 60 || y < -60 || y > H + 60) {
        Body.setPosition(b, { x: W / 2, y: H / 2 });
        Body.setVelocity(b, { x: 0, y: 0 });
      }
      const v = b.velocity;
      const sp = Math.hypot(v.x, v.y);
      if (sp > MAX_V) Body.setVelocity(b, { x: (v.x / sp) * MAX_V, y: (v.y / sp) * MAX_V });
    }
  }

  /** The electromagnet: ~1g at the far floor, up to 5g up close, steel only; damped once it's on. */
  function attract() {
    if (!magnet) return;
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      if (!b || !items[i].t.metal || b === hand.bodyB) continue;
      const dx = mag.x - b.position.x;
      const dy = mag.y - b.position.y;
      const d = Math.hypot(dx, dy) || 1;
      const g = Math.min(5, (3.2 * 200 * u) / d);
      Body.applyForce(b, b.position, { x: (dx / d) * g * b.mass * 0.001, y: (dy / d) * g * b.mass * 0.001 });
      if (d < 46 * u) Body.setVelocity(b, { x: b.velocity.x * 0.86, y: b.velocity.y * 0.86 });
    }
  }

  function tick() {
    clock += STEP;
    for (let i = 0; i < due.length; i++) if (due[i] >= 0 && clock >= due[i]) spawn(i);
    if (chaos && clock > nextNudge) {
      nextNudge = clock + 1300;
      const l = live().filter((b) => b !== hand.bodyB);
      const b = l[Math.floor(Math.random() * l.length)];
      if (b) kick(b, b.velocity.x + rand(-4, 4), b.velocity.y + rand(-4, 4), rand(-0.1, 0.1));
    }
    attract();
    Engine.update(engine, STEP);
    guard();
  }

  function render() {
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      if (!b || (b.isSleeping && b !== hand.bodyB)) continue;
      const [w, h] = dims(items[i].t);
      items[i].el.style.transform = `translate3d(${(b.position.x - w / 2).toFixed(1)}px,${(b.position.y - h / 2).toFixed(1)}px,0) rotate(${b.angle.toFixed(4)}rad)`;
    }
  }

  function frame(_time: number, dt: number) {
    acc += Math.min(dt, 100);
    let n = 0;
    while (acc >= STEP && n < 4) {
      tick();
      acc -= STEP;
      n++;
    }
    if (n === 4) acc = 0;
    render();
  }

  function kick(b: Body, vx: number, vy: number, spin: number) {
    Sleeping.set(b, false);
    Body.setVelocity(b, { x: vx, y: vy });
    Body.setAngularVelocity(b, spin);
  }

  function release() {
    const b = hand.bodyB;
    hand.bodyB = null;
    hand.pointB = { x: 0, y: 0 };
    if (b) Sleeping.set(b, false);
  }

  Events.on(engine, "collisionStart", (e) => {
    for (const p of e.pairs) {
      if (magnet && (p.bodyA === magnetBody || p.bodyB === magnetBody)) {
        sound.clack();
        continue;
      }
      const a = p.bodyA.velocity;
      const b = p.bodyB.velocity;
      if (Math.hypot(a.x - b.x, a.y - b.y) > 5) {
        sound.impact();
        break;
      }
    }
  });

  measure();
  buildWalls();
  items.forEach(({ el }) => el.setAttribute("data-parked", ""));

  return {
    start() {
      if (running) return;
      running = true;
      acc = 0;
      gsap.ticker.add(frame);
    },
    stop() {
      if (!running) return;
      running = false;
      gsap.ticker.remove(frame);
    },
    /** Rain everything in, a beat apart, in a shuffled order. */
    drop() {
      if (dropped) return;
      dropped = true;
      const order = [...items.keys()].sort(() => Math.random() - 0.5);
      order.forEach((i, k) => (due[i] = clock + 120 + k * 95));
    },
    /** The tray changed size: new walls, bodies rescaled and kept inside. */
    resize() {
      const [oW, oH, oU] = [W, H, u];
      measure();
      buildWalls();
      const k = u / oU;
      for (const b of live()) {
        if (Math.abs(k - 1) > 0.001) Body.scale(b, k, k);
        Body.setPosition(b, { x: clamp((b.position.x * W) / (oW || W), 20, W - 20), y: clamp((b.position.y * H) / (oH || H), 20, H - 20) });
        Sleeping.set(b, false);
      }
    },
    setGravity(g: Gravity) {
      gravity = g;
      engine.gravity.x = 0;
      engine.gravity.y = GRAVITY.find((x) => x.id === g)?.y ?? 1;
      for (const b of live()) {
        if (g === "zero") kick(b, b.velocity.x + rand(-1.2, 1.2), b.velocity.y - rand(0.5, 2.2), rand(-0.03, 0.03));
        else Sleeping.set(b, false);
      }
    },
    setMagnet(on: boolean) {
      magnet = on;
      for (let i = 0; i < bodies.length; i++) if (items[i].t.metal && bodies[i]) Sleeping.set(bodies[i]!, false);
    },
    setChaos(on: boolean) {
      chaos = on;
      walls.forEach((w) => (w.restitution = on ? 0.9 : 0.25));
      for (const b of live()) {
        b.restitution = on ? 0.85 : 0.28;
        b.frictionAir = on ? 0.004 : 0.012;
        Sleeping.set(b, false);
      }
    },
    shake() {
      for (const b of live()) kick(b, rand(-7, 7), (gravity === "up" ? 1 : -1) * rand(8, 15), rand(-0.3, 0.3));
    },
    /** Keyboard tilt: everything slides one way. */
    tilt(dx: number, dy: number) {
      for (const b of live()) kick(b, b.velocity.x + dx * 6, b.velocity.y + dy * 8, b.angularVelocity + dx * 0.04);
    },
    /** Shockwave from a local point (chaos:burst). */
    blast(x: number, y: number) {
      for (const b of live()) {
        const dx = b.position.x - x;
        const dy = b.position.y - y;
        const d = Math.hypot(dx, dy) || 1;
        const f = clamp(1 - d / 600, 0, 1) * 18;
        if (f > 0) kick(b, b.velocity.x + (dx / d) * f, b.velocity.y + (dy / d) * f, rand(-0.3, 0.3));
      }
    },
    /** Grab body i at local (x, y). false if it hasn't landed in the tray yet. */
    hold(i: number, x: number, y: number) {
      const b = bodies[i];
      if (!b) return false;
      hand.bodyB = b;
      hand.pointA = { x, y };
      hand.pointB = { x: x - b.position.x, y: y - b.position.y };
      (hand as MatterNS.Constraint & { angleB: number }).angleB = b.angle;
      Sleeping.set(b, false);
      return true;
    },
    move(x: number, y: number) {
      hand.pointA = { x, y };
    },
    release,
    destroy() {
      gsap.ticker.remove(frame);
      running = false;
      Events.off(engine, "collisionStart");
      Composite.clear(world, false);
      Engine.clear(engine);
      bodies = [];
      due = [];
    },
  };
}
