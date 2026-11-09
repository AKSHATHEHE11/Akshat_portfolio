"use client";
// "Fabric first": weight, weave and stretch as things you can poke at.
//   Weight  — a swatch drops onto a scale; the needle settles on the oz (tap to weigh again)
//   Weave   — a loupe over the real procedural weave; move across it to inspect the threads
//   Stretch — pull the fabric; it gives exactly as much as its stretch %, then snaps back
import { useLayoutEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { clamp } from "@/lib/utils";
import { specFor, useFabric } from "../fabric";
import type { Colourway, Product } from "../scene";

const cell = "flex flex-col rounded-[4px] border border-(--fy-fg)/15 bg-[#efebe2] p-3";

export function FabricFirst({ product, colour }: { product: Product; colour: Colourway }) {
  const f = product.fabric;
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <WeightScale oz={f.oz} colour={colour.hex} />
      <WeaveLoupe colour={colour} product={product} />
      <StretchTest stretch={f.stretch} colour={colour} product={product} />
    </div>
  );
}

const angle = (oz: number) => -90 + ((clamp(oz, 4, 16) - 4) / 12) * 180;
const polar = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return [60 + r * Math.sin(a), 74 - r * Math.cos(a)] as const;
};

function WeightScale({ oz, colour }: { oz: number; colour: string }) {
  const root = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();
  const [weighs, setWeighs] = useState(0);
  const zone = oz < 8 ? "Light" : oz < 12 ? "Mid-weight" : "Heavy";

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const needle = q("[data-needle]");
      if (reduced) {
        gsap.set(needle, { rotation: angle(oz), svgOrigin: "60 74" });
        return;
      }
      gsap
        .timeline()
        .fromTo(q("[data-swatch]"), { y: -26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "bounce.out" })
        .fromTo(needle, { rotation: angle(4) }, { rotation: angle(oz), svgOrigin: "60 74", duration: 1.6, ease: "elastic.out(1, 0.32)" }, 0.28);
    },
    // revert: a re-weigh mid-swing restarts the drop instead of two needles fighting
    { scope: root, dependencies: [oz, weighs, reduced], revertOnUpdate: true },
  );

  const ticks = Array.from({ length: 13 }, (_, i) => i + 4);
  return (
    <button
      ref={root}
      type="button"
      onClick={() => {
        play("drop");
        setWeighs((n) => n + 1);
      }}
      aria-label={`Weight: ${oz} ounces, ${zone.toLowerCase()}. Weigh again`}
      data-cursor="hover"
      className={`${cell} text-left transition-colors hover:border-(--fy-fg)/40`}
    >
      <svg viewBox="0 0 120 80" className="w-full" aria-hidden>
        <rect data-swatch x="40" y="5" width="40" height="9" rx="1" fill={colour} stroke="#14161c" strokeOpacity=".25" />
        <path d="M34 15h52l-4 4H38z" fill="#14161c" />
        <path d="M60 19v6" stroke="#14161c" strokeWidth="2" />
        <path d={`M${polar(-90, 50).join(" ")}A50 50 0 0 1 ${polar(90, 50).join(" ")}`} fill="none" stroke="#14161c" strokeOpacity=".2" strokeWidth="9" />
        <path d={`M${polar(30, 50).join(" ")}A50 50 0 0 1 ${polar(90, 50).join(" ")}`} fill="none" stroke="var(--fy-accent)" strokeWidth="9" />
        {ticks.map((v) => {
          const a = angle(v);
          const [x1, y1] = polar(a, 46);
          const [x2, y2] = polar(a, v % 4 === 0 ? 39 : 42);
          return <line key={v} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#14161c" strokeWidth={v % 4 === 0 ? 1.4 : 0.8} />;
        })}
        {[4, 8, 12, 16].map((v) => {
          const [x, y] = polar(angle(v), 31);
          return (
            <text key={v} x={x} y={y + 2.5} textAnchor="middle" fontSize="7" fontFamily="var(--font-mono)" fill="#14161c">
              {v}
            </text>
          );
        })}
        <g data-needle>
          <path d="M59 74 60 30 61 74z" fill="#ff5a1f" />
          <circle cx="60" cy="74" r="3.6" fill="#14161c" />
        </g>
      </svg>
      <span className="mt-1 font-serif text-[1.75rem] italic leading-none">{oz} oz</span>
      <span className="mt-1 text-[0.75rem] leading-tight text-(--fy-muted)">{zone} · tap to weigh again</span>
    </button>
  );
}

function WeaveLoupe({ colour, product }: { colour: Colourway; product: Product }) {
  const url = useFabric(specFor(colour, product.fabric.weave));
  const lens = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    if (lens.current) lens.current.style.backgroundPosition = `${x}% ${y}%`;
  };
  return (
    <div className={cell}>
      <div className="grid flex-1 place-items-center py-1">
        <div
          ref={lens}
          onPointerMove={move}
          data-cursor="view"
          data-cursor-label="LOOK"
          aria-hidden
          className="relative aspect-square w-[72%] max-w-32 touch-pan-y rounded-full border-[3px] border-[#14161c] shadow-[0_8px_18px_-8px_rgb(0_0_0/0.6)]"
          style={{ backgroundColor: colour.hex, backgroundImage: url ? `url(${url})` : undefined, backgroundSize: "300px", backgroundPosition: "50% 50%" }}
        >
          <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_32%_28%,rgb(255_255_255/0.4),transparent_38%)]" />
          <span className="absolute -bottom-3 -right-2 h-6 w-2.5 rotate-[-40deg] rounded-[2px] bg-[#14161c]" />
        </div>
      </div>
      <span className="mt-2 text-[0.9375rem] font-semibold leading-tight">{product.fabric.weaveName}</span>
      <span className="mt-1 text-[0.75rem] leading-tight text-(--fy-muted)">{product.fabric.composition}</span>
    </div>
  );
}

function StretchTest({ stretch, colour, product }: { stretch: number; colour: Colourway; product: Product }) {
  const url = useFabric(specFor(colour, product.fabric.weave));
  const track = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(120);
  const x = useMotionValue(0);
  const give = 4 + stretch * 5.5; // px the fabric is allowed to travel
  const scaleX = useTransform(x, (v) => 1 + Math.max(-0.02, v) / width);
  const read = useTransform(x, (v) => (stretch ? `+${((clamp(v, 0, give) / give) * stretch).toFixed(1)}%` : v > 2 ? "won't give" : "+0%"));

  useLayoutEffect(() => {
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth * 0.62));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pull = () => {
    play("press");
    void animate(x, give, { type: "spring", stiffness: 320, damping: 14 }).then(() =>
      animate(x, 0, { type: "spring", stiffness: 260, damping: stretch ? 9 : 20 }),
    );
  };

  return (
    <div className={cell}>
      <div ref={track} className="relative flex h-[4.75rem] items-center">
        <span aria-hidden className="absolute left-0 top-1/2 z-[1] h-12 w-2.5 -translate-y-1/2 rounded-[2px] bg-[#14161c]" />
        <motion.div
          aria-hidden
          className="ml-1 h-9 origin-left"
          style={{ width: "62%", scaleX, backgroundColor: colour.hex, backgroundImage: url ? `url(${url})` : undefined, backgroundSize: "96px" }}
        />
        <motion.button
          type="button"
          drag="x"
          dragConstraints={{ left: 0, right: give }}
          dragElastic={0.05}
          dragMomentum={false}
          dragSnapToOrigin
          dragTransition={{ bounceStiffness: 420, bounceDamping: stretch ? 10 : 24 }}
          onDragStart={() => play("press")}
          onTap={pull}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              pull();
            }
          }}
          style={{ x, left: "calc(62% + 0.25rem - 1rem)" }}
          data-cursor="drag"
          data-cursor-label="PULL"
          aria-label={`Stretch test: ${stretch ? `${stretch}% stretch` : "rigid, no stretch"}. Pull the fabric`}
          className="absolute top-1/2 z-[1] grid h-12 w-11 -translate-y-1/2 cursor-grab touch-none place-items-center active:cursor-grabbing"
        >
          {/* the 12px clamp you see; the button around it is a 44px grip */}
          <span aria-hidden className="h-12 w-3 rounded-[2px] bg-[#14161c]" />
        </motion.button>
      </div>
      <span className="mt-2 flex items-baseline justify-between gap-2">
        <span className="text-[0.9375rem] font-semibold leading-tight">{stretch ? `${stretch}% stretch` : "Rigid"}</span>
        <motion.span className="font-mono text-[0.75rem] tabular-nums">{read}</motion.span>
      </span>
      <span className="mt-1 text-[0.75rem] leading-tight text-(--fy-muted)">{product.fabric.hand}</span>
    </div>
  );
}
