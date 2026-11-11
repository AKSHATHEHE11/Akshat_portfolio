// One shared pointer tracker for the whole site (cursor, HUD coordinates, chaos trails, tilt effects).
// It never triggers React renders: read `pointer` inside your own rAF / gsap.ticker / useFrame.
//
//   import { pointer, trackPointer } from "@/lib/pointer";
//   useEffect(() => trackPointer(), []);          // (Providers already does this once)
//   gsap.ticker.add(() => el.style.translate = `${pointer.x}px ${pointer.y}px`);
//
// x, y        viewport px          nx, ny   normalised -1..1 (centre = 0, up = +1 like three.js)
// vx, vy      px per frame (smoothed)        speed    |v| smoothed
// down        primary button held             inside  pointer is over the window
export const pointer = {
  x: typeof window !== "undefined" ? window.innerWidth / 2 : 0,
  y: typeof window !== "undefined" ? window.innerHeight / 2 : 0,
  nx: 0,
  ny: 0,
  vx: 0,
  vy: 0,
  speed: 0,
  down: false,
  inside: false,
};

let started = false;

/** Starts tracking (idempotent). Returns a cleanup. */
export function trackPointer() {
  if (started || typeof window === "undefined") return () => {};
  started = true;
  let lastX = pointer.x;
  let lastY = pointer.y;
  let raf = 0;

  // The velocity smoothing runs per frame only while the pointer moves or its velocity is still
  // decaying; a still pointer costs nothing (the next move wakes it).
  const move = (e: PointerEvent) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.nx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ny = -((e.clientY / window.innerHeight) * 2 - 1);
    pointer.inside = true;
    if (!raf) raf = requestAnimationFrame(loop);
  };
  const down = () => (pointer.down = true);
  const up = () => (pointer.down = false);
  const leave = () => (pointer.inside = false);

  const loop = () => {
    const dx = pointer.x - lastX;
    const dy = pointer.y - lastY;
    pointer.vx += (dx - pointer.vx) * 0.25;
    pointer.vy += (dy - pointer.vy) * 0.25;
    pointer.speed = Math.hypot(pointer.vx, pointer.vy);
    lastX = pointer.x;
    lastY = pointer.y;
    if (dx || dy || pointer.speed > 0.001) {
      raf = requestAnimationFrame(loop);
      return;
    }
    pointer.vx = pointer.vy = pointer.speed = 0;
    raf = 0;
  };

  window.addEventListener("pointermove", move, { passive: true });
  window.addEventListener("pointerdown", down, { passive: true });
  window.addEventListener("pointerup", up, { passive: true });
  // a touch that turns into a scroll ends in pointercancel, never pointerup
  window.addEventListener("pointercancel", up, { passive: true });
  document.documentElement.addEventListener("pointerleave", leave);

  return () => {
    started = false;
    cancelAnimationFrame(raf);
    raf = 0;
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerdown", down);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", up);
    document.documentElement.removeEventListener("pointerleave", leave);
  };
}
