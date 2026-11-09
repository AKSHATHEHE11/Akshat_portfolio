"use client";
import { useEffect, useRef } from "react";
import { useChaos, useReducedMotion } from "@/lib/hooks";

const TILE = 160;
// Fixed offsets inside one tile. The grain jumps between them (steps), it never slides.
const JUMPS = [
  [0, 0],
  [-61, 23],
  [37, -88],
  [-104, -47],
  [88, 71],
  [-23, 112],
  [121, -19],
  [-139, 96],
  [54, -131],
  [-77, -9],
];

/** One tile of luminance noise, drawn once per mount. */
function noiseTile(size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i + 1] = d[i + 2] = (Math.random() * 256) | 0;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL("image/png");
}

/**
 * Film grain over everything. ~10 jumps a second (stepped background-position); 0.05 light,
 * 0.08 dark, 0.13 and 2.4× faster in chaos. Static under reduced motion.
 */
export default function Grain() {
  const ref = useRef<HTMLDivElement>(null);
  const anim = useRef<Animation | null>(null);
  const chaos = useChaos();
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    const url = el ? noiseTile(TILE) : null;
    if (el && url) el.style.backgroundImage = `url(${url})`;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || typeof el.animate !== "function") return;
    const a = el.animate(
      JUMPS.map(([x, y]) => ({ backgroundPosition: `${x}px ${y}px`, easing: "steps(1, end)" })),
      { duration: 1000, iterations: Infinity },
    );
    anim.current = a;
    return () => {
      a.cancel();
      anim.current = null;
    };
  }, [reduced]);

  useEffect(() => {
    anim.current?.updatePlaybackRate(chaos ? 2.4 : 1);
  }, [chaos, reduced]);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[95] opacity-[0.05] [contain:strict] print:hidden dark:opacity-[0.08] chaos:opacity-[0.13]"
      style={{ viewTransitionName: "site-grain", backgroundSize: `${TILE}px ${TILE}px` }}
    />
  );
}
