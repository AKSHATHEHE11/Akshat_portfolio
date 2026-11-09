"use client";
// Identity: the magazine cover. Stage + huge serif FYBR8 (both morph targets, rendered immediately),
// a real cloth hanging over the title (R3F, lazy), the rack of pieces, cover lines and the barcode.
import dynamic from "next/dynamic";
import Image from "next/image";
import { Component, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { Morph } from "@/components/transitions/Morph";
import { gsap, useGSAP } from "@/lib/gsap";
import { useChaos, useCoarse, useOnScreen, useReducedMotion } from "@/lib/hooks";
import { pointer } from "@/lib/pointer";
import { play } from "@/lib/sound";
import { useSystem } from "@/lib/system";
import { morph } from "@/lib/transitions";
import type { Project } from "@/lib/types";
import { clamp, cn, seeded } from "@/lib/utils";
import { ClothRolled, ClothStatic } from "./ClothStatic";
import { weftFor } from "./fabric";
import { Garment } from "./Garment";
import type { FashionScene } from "./scene";
import { useStore } from "./store/context";

// while three.js loads, the rod and the rolled cloth hold the cloth's place (no 58svh hole on phones)
const Cloth = dynamic(() => import("./Cloth"), { ssr: false, loading: () => <ClothRolled /> });

const never = () => () => {};
const hasWebGL = () => typeof window.WebGLRenderingContext !== "undefined";

/** If WebGL fails to start, fall back to the painted cloth instead of taking the page down. */
class Quiet extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function Cover({ project }: { project: Project<FashionScene> }) {
  const { scene, color } = project;
  const { product, colourOf, openQuick, go, money } = useStore();
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const coarse = useCoarse();
  const chaos = useChaos();
  const ready = useSystem((s) => s.ready);
  const bootedNow = useSystem((s) => s.booted);
  const onScreen = useOnScreen(root, "0px");
  // null on the server and during hydration, then whether this browser has WebGL at all
  const supported = useSyncExternalStore(never, hasWebGL, () => null);
  const [glFailed, setGlFailed] = useState(false);
  const webgl = supported === null ? null : supported && !glFailed;
  // never wait forever for a boot signal: after 10 s the cover behaves as booted
  const [stale, setStale] = useState(false);
  const booted = bootedNow || stale;

  useEffect(() => {
    if (!ready || bootedNow) return;
    const t = setTimeout(() => setStale(true), 10_000);
    return () => {
      clearTimeout(t);
      // booted (or gone): forget the fallback, so a later RESTART waits for the real boot again
      setStale(false);
    };
  }, [ready, bootedNow]);

  // the house denim: first twill colourway in the store
  const house = useMemo(() => {
    const p = scene.products.find((x) => x.fabric.weave === "twill-3x1") ?? scene.products[0];
    const c = p.colours[0];
    return { warp: c.hex, weft: weftFor(c, p.fabric.weave) };
  }, [scene.products]);

  const letters = useMemo(() => Array.from(project.title.toUpperCase()), [project.title]);
  const use3d = webgl === true && !reduced && !project.heroImage;

  // intro — plays when the system has booted (and again after a restart). Nothing is hidden before it.
  useGSAP(
    () => {
      if (!booted || reduced) return;
      const q = gsap.utils.selector(root);
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.from(q("[data-letter]"), { yPercent: 22, skewX: -12, duration: 1.2, stagger: 0.06 }, 0)
        .from(q("[data-intro]"), { y: 26, opacity: 0, duration: 1, stagger: 0.07 }, 0.25)
        .from(q("[data-rack]"), { x: 70, rotation: 14, opacity: 0, duration: 1.1, stagger: 0.1, ease: "back.out(1.6)" }, 0.35)
        .from(q("[data-bars]"), { scaleX: 0, transformOrigin: "0 50%", duration: 0.9, ease: "machine" }, 0.6);
    },
    { scope: root, dependencies: [booted, reduced], revertOnUpdate: true },
  );

  // the title ripples like cloth as the cursor passes over it
  useGSAP(
    () => {
      if (reduced || coarse || !onScreen) return;
      const inner = gsap.utils.toArray<HTMLElement>("[data-ripple]", root.current);
      const ys = inner.map((el) => gsap.quickTo(el, "yPercent", { duration: 0.7, ease: "power3.out" }));
      const sk = inner.map((el) => gsap.quickTo(el, "skewX", { duration: 0.9, ease: "power3.out" }));
      const tick = () => {
        inner.forEach((el, i) => {
          const r = el.getBoundingClientRect();
          const dx = (pointer.x - (r.left + r.width / 2)) / r.width;
          const dy = (pointer.y - (r.top + r.height / 2)) / r.height;
          const near = pointer.inside ? Math.exp(-(dx * dx * 0.8 + dy * dy * 0.9)) : 0;
          ys[i](-near * 8);
          sk[i](clamp(pointer.vx * 0.7, -16, 16) * near);
        });
      };
      gsap.ticker.add(tick);
      return () => gsap.ticker.remove(tick);
    },
    { scope: root, dependencies: [reduced, coarse, onScreen], revertOnUpdate: true },
  );

  // chaos: the type warps, and the clothes fly off the rack
  useGSAP(
    (_, contextSafe) => {
      if (!chaos || reduced || !contextSafe) return;
      const outer = gsap.utils.toArray<HTMLElement>("[data-letter]", root.current);
      gsap.to(outer, {
        skewX: "random(-24, 24)",
        scaleY: "random(0.72, 1.32)",
        rotation: "random(-7, 7)",
        duration: 0.9,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        repeatRefresh: true,
        stagger: { each: 0.09, from: "random" },
      });
      const items = gsap.utils.toArray<HTMLElement>("[data-fly]", root.current);
      let n = 0;
      const fling = contextSafe(() => {
        const el = items[n++ % items.length];
        if (!el || !onScreen) return;
        const dir = n % 2 ? -1 : 1;
        play("glitch");
        gsap
          .timeline()
          .to(el, { x: -gsap.utils.random(240, 520), y: -gsap.utils.random(40, 140), rotation: dir * gsap.utils.random(30, 80), duration: 0.55, ease: "power2.out" })
          .to(el, { y: "+=" + window.innerHeight * 0.75, rotation: "+=" + dir * 140, opacity: 0, duration: 0.8, ease: "power2.in" })
          .set(el, { x: 0, y: -50, rotation: 0 })
          .to(el, { y: 0, opacity: 1, duration: 0.6, ease: "back.out(2)" });
      });
      const id = window.setInterval(fling, 1900);
      return () => window.clearInterval(id);
    },
    { scope: root, dependencies: [chaos, reduced, onScreen], revertOnUpdate: true },
  );

  return (
    <section ref={root} id="cover" aria-label={`${project.title} — cover`} className="relative isolate min-h-svh overflow-hidden" style={{ color: color.fg }}>
      <Morph name={morph.stage(project.slug)}>
        <div aria-hidden className={cn("absolute inset-0", "fy-paper")} style={{ backgroundColor: color.bg }} />
      </Morph>

      {/* bottom padding keeps the cover lines clear of the HUD row and the world's control bar */}
      <div className="relative flex min-h-svh flex-col px-(--margin) pb-10 pt-[calc(var(--nav-h)+0.75rem)] lg:pb-36">
        {/* folio line */}
        <div data-intro className="flex items-center justify-between gap-4 border-b border-current/25 pb-2 font-mono text-[0.6875rem] uppercase tracking-[0.14em]">
          <span>
            {scene.issue} · {scene.season}
          </span>
          <span className="hidden sm:block">{project.category}</span>
          <span className="flex items-center gap-2">
            <span aria-hidden className="inline-block size-1.5 rounded-full" style={{ background: color.accent, boxShadow: `0 0 0 1px ${color.fg}` }} />
            {project.status} · {project.year}
          </span>
        </div>

        <Morph name={morph.title(project.slug)} variant="text">
          <h1
            aria-label={project.title}
            className="relative z-[1] -ml-[0.04em] mt-3 w-fit font-serif text-[29vw] italic leading-[0.8] tracking-[-0.035em] lg:mt-6 lg:text-[min(24.5vw,30rem)]"
          >
            {letters.map((ch, i) => (
              <span key={i} data-letter aria-hidden className="inline-block origin-bottom will-change-transform">
                <span data-ripple className="inline-block">
                  {ch}
                </span>
              </span>
            ))}
          </h1>
        </Morph>

        {/* the cloth — over the title like the model on a cover */}
        <div
          className="relative z-[2] -mt-[5vw] h-[58svh] w-full lg:absolute lg:right-[max(15vw,9rem)] lg:top-[calc(var(--nav-h)+3rem)] lg:mt-0 lg:h-[calc(100%-var(--nav-h)-7.5rem)] lg:w-[38vw]"
          style={{ "--fy-house": house.warp } as CSSProperties}
          data-cursor={use3d ? "drag" : undefined}
          data-cursor-label={use3d ? "TUG" : undefined}
        >
          <span aria-hidden className="absolute inset-x-[16%] bottom-[3%] h-[10%] rounded-[50%] bg-black/25 blur-2xl" />
          {project.heroImage ? (
            <Image src={project.heroImage} alt={project.title} fill sizes="(min-width: 1024px) 34vw, 100vw" className="object-cover" priority />
          ) : use3d ? (
            <Quiet onError={() => setGlFailed(true)}>
              <Cloth
                active={onScreen}
                chaos={chaos}
                booted={booted}
                coarse={coarse}
                warp={house.warp}
                weft={house.weft}
                accent={color.accent}
                ink={color.fg}
                patch={project.title.toUpperCase()}
              />
            </Quiet>
          ) : webgl !== null || reduced ? (
            <ClothStatic warp={house.warp} weft={house.weft} accent={color.accent} ink={color.fg} patch={project.title.toUpperCase()} />
          ) : (
            <ClothRolled />
          )}
          {use3d ? (
            <p data-intro aria-hidden className="pointer-events-none absolute -left-2 bottom-[46%] hidden -translate-x-full items-center gap-2 font-serif text-[1.35rem] italic leading-none lg:flex">
              go on, tug it
              <svg viewBox="0 0 46 20" className="h-4 w-11" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                <path d="M1 14C12 3 26 2 42 9M35 3l7 6-8 4" />
              </svg>
            </p>
          ) : null}
        </div>

        <p data-intro className="relative z-[3] mt-6 max-w-[22ch] text-lede font-medium leading-snug lg:mt-4 lg:max-w-[24ch]">
          {project.tagline}
        </p>

        {/* rack: the three pieces from the cover, one tap from the quick view */}
        <ul className="relative z-[3] mt-6 grid grid-cols-3 gap-3 sm:max-w-md lg:absolute lg:right-(--margin) lg:top-[calc(var(--nav-h)+4.5rem)] lg:mt-0 lg:w-[7vw] lg:min-w-24 lg:grid-cols-1">
          {scene.rack.map((id) => {
            const p = product(id);
            if (!p) return null;
            const c = colourOf(id);
            return (
              <li key={id} data-rack>
                <button
                  type="button"
                  onClick={() => openQuick(id)}
                  onPointerEnter={() => play("tick")}
                  data-cursor="view"
                  data-cursor-label="VIEW"
                  data-chaos-escape
                  aria-label={`Quick view: ${p.name}, ${money(p.price)}`}
                  className="group relative block aspect-square w-full rounded-[4px] border border-current/30 bg-[#f4f1ea] transition-colors duration-300 hover:border-current"
                >
                  <span aria-hidden className="absolute left-1/2 top-0 h-3 w-px -translate-y-full bg-current/40" />
                  {/* hover tilts with `rotate`; the chaos fling tweens `transform` — kept apart so CSS never smooths GSAP */}
                  <span data-fly className="absolute inset-[9%] block origin-top transition-[rotate] duration-500 ease-out-expo group-hover:-rotate-6">
                    <Garment kind={p.kind} colour={p.colours[c].hex} leg={p.leg} pocket={p.pocket} className="size-full drop-shadow-[0_8px_8px_rgb(20_22_28/0.18)]" still />
                  </span>
                  <span className="pointer-events-none absolute -bottom-2 right-1 translate-y-1 rounded-[2px] bg-(--fy-fg) px-1.5 py-0.5 font-mono text-[0.6875rem] text-(--fy-paper) opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:opacity-100">
                    {money(p.price)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="min-h-8 flex-1" />

        {/* cover lines — they are also the world's table of contents */}
        <ol className="relative z-[3] mt-10 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:mt-0 lg:max-w-[44vw]">
          {scene.coverLines.map((line) => (
            <li key={line.lead} data-intro>
              <a
                href={`#${line.target === "fit" ? "preview" : line.target}`}
                onClick={(e) => {
                  e.preventDefault();
                  play("click");
                  go(line.target);
                }}
                onPointerEnter={() => play("tick")}
                data-cursor="hover"
                className="group grid grid-cols-[auto_1fr] items-baseline gap-x-3"
              >
                <span className="font-serif text-[clamp(1.75rem,1.1rem+1.5vw,2.75rem)] italic leading-none">{line.lead}</span>
                <span className="max-w-[24ch] text-[0.95rem] font-medium leading-tight decoration-1 underline-offset-4 group-hover:underline">{line.text}</span>
              </a>
            </li>
          ))}
        </ol>

        <Barcode code={scene.barcode} label={`${scene.issue} · ${scene.season}`} />
      </div>
    </section>
  );
}

function Barcode({ code, label }: { code: string; label: string }) {
  const { bars, width } = useMemo(() => {
    const out: { x: number; w: number; tall: boolean }[] = [];
    let x = 0;
    for (let i = 0; i < 59; i++) {
      const w = 1 + Math.floor(seeded(i * 17 + code.charCodeAt(i % code.length)) * 3);
      if (i % 2 === 0) out.push({ x, w, tall: i < 4 || i > 54 || (i > 27 && i < 32) });
      x += w;
    }
    return { bars: out, width: x };
  }, [code]);
  return (
    <div data-chaos-drift className="relative z-[3] mt-8 flex w-40 flex-col items-start gap-1 self-end lg:absolute lg:bottom-36 lg:right-(--margin) lg:mt-0 lg:w-36" aria-hidden>
      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em]">{label}</span>
      <svg data-bars viewBox={`0 0 ${width} 44`} preserveAspectRatio="none" className="h-12 w-full bg-[#f4f1ea] px-1.5 pt-1.5">
        {bars.map((b) => (
          <rect key={b.x} x={b.x} width={b.w} height={b.tall ? 44 : 38} fill="currentColor" />
        ))}
      </svg>
      <span className="w-full whitespace-nowrap bg-[#f4f1ea] px-1.5 pb-1 text-center font-mono text-[0.6875rem] tracking-[0.12em]">
        {code.replace(/^(\d)(\d{6})(\d{6})$/, "$1 $2 $3")}
      </span>
    </div>
  );
}
