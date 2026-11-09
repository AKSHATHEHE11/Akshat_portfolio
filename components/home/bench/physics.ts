// matter-js world for the bench. DOM elements are the renderer: each frame copies body position +
// angle into a transform. Fixed 60 Hz steps on the GSAP ticker; the caller starts/stops it with
// visibility. Coordinates are local to `root` (the section).
import type MatterNS from "matter-js";
import { gsap } from "@/lib/gsap";
import { clamp } from "@/lib/utils";
import type { Thing } from "./things";

type M = typeof MatterNS;
type Body = MatterNS.Body;
export interface Item {
  el: HTMLElement;
  t: Thing;
}
export type Bench = ReturnType<typeof createBench>;

const STEP = 1000 / 60;
const MAX_V = 42;
// Bodies ignore the ceiling until they have fallen into the box, so they can be dropped from above it.
const CAT = { wall: 0x1, ceil: 0x2, body: 0x4 };
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pentagon = (r: number) =>
  Array.from({ length: 5 }, (_, k) => {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  });

export function createBench(Matter: M, root: HTMLElement, floor: HTMLElement, items: Item[], onImpact: () => void) {
  const { Engine, Bodies, Body, Composite, Constraint, Events, Sleeping } = Matter;
  const engine = Engine.create({ enableSleeping: true, positionIterations: 8, velocityIterations: 6 });
  const world = engine.world;
  // The hand: a spring from the pointer to the grabbed point of a body (what MouseConstraint does,
  // minus its window-wide listeners that would block page scrolling on touch).
  const hand = Constraint.create({ pointA: { x: 0, y: 0 }, pointB: { x: 0, y: 0 }, length: 0.01, stiffness: 0.2, damping: 0.08 });
  Composite.add(world, hand);

  let W = 0;
  let H = 0;
  let F = 0;
  let u = 1;
  let walls: Body[] = [];
  let bodies: (Body | null)[] = items.map(() => null);
  let due: number[] = items.map(() => -1);
  let dropped = false;
  let chaos = false;
  let clock = 0;
  let acc = 0;
  let running = false;
  let nextNudge = 0;

  const dims = (t: Thing) => [t.w * u, t.h * u] as const;
  const live = () => bodies.filter((b): b is Body => b !== null);

  function measure() {
    W = root.clientWidth;
    H = root.clientHeight;
    F = floor.offsetTop;
    u = clamp(W / 1440, 0.62, 1); // must match --u in bench.css
  }

  function buildWalls() {
    Composite.remove(world, walls);
    const T = 400;
    const o = { isStatic: true, friction: 0.7, restitution: chaos ? 0.95 : 0.2, collisionFilter: { category: CAT.wall } };
    walls = [
      Bodies.rectangle(W / 2, F + T / 2, W + T * 2, T, o),
      Bodies.rectangle(-T / 2, H / 2, T, H * 4, o),
      Bodies.rectangle(W + T / 2, H / 2, T, H * 4, o),
      Bodies.rectangle(W / 2, -T / 2, W + T * 2, T, { ...o, collisionFilter: { category: CAT.ceil, mask: CAT.body } }),
    ];
    Composite.add(world, walls);
  }

  function spawn(i: number) {
    const { t, el } = items[i];
    due[i] = -1;
    if (getComputedStyle(el).display === "none") return; // not on the bench at this width
    const [w, h] = dims(t);
    const pose = W < 640 ? (t.m ?? t.d) : t.d;
    // keycaps fall dead flat and on their marks so the word reads once they land: a ~5° tilt at
    // landing speed catches a corner and rolls the cap onto its side. Throwing them is another matter.
    const key = t.kind === "key";
    const x = clamp((pose[0] / 100) * W + rand(-24, 24) * u * (key ? 0.15 : 1), w / 2 + 6, W - w / 2 - 6);
    const o = {
      angle: key ? 0 : rand(-0.5, 0.5),
      restitution: chaos ? 0.9 : 0.25,
      friction: 0.5,
      frictionAir: chaos ? 0.003 : 0.012,
      // solid caps: the lighter shapes that land on them (phones stack the pile) glance off instead
      // of flipping them. Drag, throw and shake set velocities, so handling feels the same.
      density: key ? 0.0045 : 0.0018,
      collisionFilter: { category: CAT.body, mask: CAT.wall | CAT.body },
    };
    const y = -h - rand(10, 90);
    const b =
      t.shape === "circle"
        ? Bodies.circle(x, y, w / 2, o)
        : t.shape === "hex"
          ? Bodies.polygon(x, y, 6, (w / 2) * 0.98, o)
          : t.shape === "pent"
            ? Bodies.fromVertices(x, y, [pentagon((w / 2) * 0.86)], o)
            : Bodies.rectangle(x, y, w, h, { ...o, chamfer: { radius: (t.r ?? 8) * u } });
    Body.setVelocity(b, { x: key ? 0 : rand(-1.5, 1.5), y: 7 });
    Body.setAngularVelocity(b, key ? 0 : rand(-0.06, 0.06));
    Composite.add(world, b);
    bodies[i] = b;
    el.removeAttribute("data-parked");
  }

  /** Keep everything inside the box: admit to the ceiling, cap speed, rescue anything that tunnelled out. */
  function guard() {
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      if (!b) continue;
      const f = b.collisionFilter;
      const mask = f.mask ?? 0;
      if (!(mask & CAT.ceil) && b.position.y > dims(items[i].t)[1] * 0.6) f.mask = mask | CAT.ceil;
      const { x, y } = b.position;
      if (x < -300 || x > W + 300 || y > H + 300 || y < -1200) {
        Body.setPosition(b, { x: W / 2, y: -80 });
        Body.setVelocity(b, { x: 0, y: 8 });
        f.mask = CAT.wall | CAT.body;
      }
      const v = b.velocity;
      const sp = Math.hypot(v.x, v.y);
      if (sp > MAX_V) Body.setVelocity(b, { x: (v.x / sp) * MAX_V, y: (v.y / sp) * MAX_V });
    }
  }

  function tick() {
    clock += STEP;
    for (let i = 0; i < due.length; i++) if (due[i] >= 0 && clock >= due[i]) spawn(i);
    if (chaos) {
      // zero-g with a faint gravity vector that wanders: things drift in slow loops
      engine.gravity.x = Math.sin(clock / 2300) * 0.05;
      engine.gravity.y = Math.cos(clock / 2900) * 0.05;
      if (clock > nextNudge) {
        nextNudge = clock + 1400;
        const l = live().filter((b) => b !== hand.bodyB);
        const b = l[Math.floor(Math.random() * l.length)];
        if (b) {
          Body.setVelocity(b, { x: b.velocity.x + rand(-3, 3), y: b.velocity.y + rand(-3, 3) });
          Body.setAngularVelocity(b, rand(-0.08, 0.08));
        }
      }
    }
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

  function release() {
    const b = hand.bodyB;
    hand.bodyB = null;
    hand.pointB = { x: 0, y: 0 };
    if (b) Sleeping.set(b, false);
  }

  function park() {
    release();
    Composite.remove(world, live());
    bodies = items.map(() => null);
    due = items.map(() => -1);
    items.forEach(({ el }) => el.setAttribute("data-parked", ""));
    dropped = false;
  }

  function drop(fast = false) {
    if (dropped) return;
    dropped = true;
    let k = 0;
    // keys first, in word order, then everything else
    const order = [...items.keys()].sort((a, b) => Number(items[b].t.kind === "key") - Number(items[a].t.kind === "key"));
    for (const i of order) {
      due[i] = clock + (items[i].t.kind === "key" ? k * 150 : 560 + (k - 4) * 95) * (fast ? 0.35 : 1);
      k++;
    }
  }

  function kick(b: Body, vx: number, vy: number, spin: number) {
    Sleeping.set(b, false);
    Body.setVelocity(b, { x: vx, y: vy });
    Body.setAngularVelocity(b, spin);
  }

  Events.on(engine, "collisionStart", (e) => {
    for (const p of e.pairs) {
      const a = p.bodyA.velocity;
      const b = p.bodyB.velocity;
      if (Math.hypot(a.x - b.x, a.y - b.y) > 5.5) {
        onImpact();
        break;
      }
    }
  });

  function start() {
    if (running) return;
    running = true;
    acc = 0;
    gsap.ticker.add(frame);
  }
  function stop() {
    if (!running) return;
    running = false;
    gsap.ticker.remove(frame);
  }

  measure();
  buildWalls();
  park();

  return {
    get dropped() {
      return dropped;
    },
    start,
    stop,
    drop,
    park,
    /** width changed: rebuild walls and re-drop at the new scale */
    rebuild() {
      const was = dropped;
      measure();
      buildWalls();
      park();
      if (was) drop(true);
    },
    shake() {
      if (!dropped) return drop();
      live().forEach((b) => kick(b, rand(-6, 6), rand(-17, -10) * (chaos ? 0.5 : 1), rand(-0.3, 0.3)));
    },
    hop() {
      live().forEach((b) => kick(b, rand(-2, 2), -11, rand(-0.1, 0.1)));
    },
    /** shockwave from a local point (chaos:burst) */
    blast(x: number, y: number) {
      for (const b of live()) {
        const dx = b.position.x - x;
        const dy = b.position.y - y;
        const d = Math.hypot(dx, dy) || 1;
        const f = clamp(1 - d / 700, 0, 1) * 22;
        if (f > 0) kick(b, b.velocity.x + (dx / d) * f, b.velocity.y + (dy / d) * f - f * 0.4, rand(-0.3, 0.3));
      }
    },
    nudge(i: number, dx: number, dy: number) {
      const b = bodies[i];
      if (b) kick(b, b.velocity.x + dx * 7, b.velocity.y + dy * 11, b.angularVelocity + dx * 0.05);
    },
    /** grab body i at local point (x,y). false if it isn't on the bench yet */
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
    setChaos(on: boolean) {
      chaos = on;
      engine.gravity.x = 0;
      engine.gravity.y = on ? 0 : 1;
      engine.enableSleeping = !on;
      walls.forEach((w) => (w.restitution = on ? 0.95 : 0.2));
      for (const b of live()) {
        b.restitution = on ? 0.9 : 0.25;
        b.frictionAir = on ? 0.003 : 0.012;
        if (on) kick(b, rand(-3, 3), rand(-7, -3), rand(-0.07, 0.07));
        else Sleeping.set(b, false);
      }
    },
    destroy() {
      stop();
      Events.off(engine, "collisionStart");
      Composite.clear(world, false);
      Engine.clear(engine);
    },
  };
}
