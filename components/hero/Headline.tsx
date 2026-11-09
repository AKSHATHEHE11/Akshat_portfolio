"use client";
// "I BUILD THINGS THAT SHOULD EXIST." — set in Archivo's width axis.
// · Each line is justified to the column by its own wdth value (not by letter-spacing).
// · Moving the cursor fast swells the letters near it and squeezes the rest of the line, so the line
//   keeps its length (an accordion, not a reflow). Calm: a little. Chaos: a lot, plus a breathing
//   wave and twitching letters.
import { Fragment, useEffect, useRef } from "react";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { gsap, useGSAP } from "@/lib/gsap";
import { useChaos, useReducedMotion } from "@/lib/hooks";
import { pointer } from "@/lib/pointer";
import { clamp, cn } from "@/lib/utils";

if (typeof window !== "undefined") gsap.registerPlugin(DrawSVGPlugin);

const REST = 84; // condensed resting width before justification
const ACCENT = 100;
const MIN = 62;
const MAX = 125;
const SQUIGGLE =
  "M8 44 C62 37 120 33 172 35 C196 36 205 22 215 25 C226 28 211 49 227 47 C242 45 236 26 251 29 C264 32 258 44 278 42 C342 37 420 29 512 20";

export function Headline({ lines }: { lines: readonly string[] }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const reduced = useReducedMotion();
  const chaos = useChaos();
  const chaosRef = useRef(chaos);

  useEffect(() => {
    chaosRef.current = chaos;
    if (chaos) return;
    ref.current?.querySelectorAll<HTMLElement>("[data-ch]").forEach((el) => {
      el.style.translate = "";
      el.style.rotate = "";
    });
  }, [chaos]);

  useEffect(() => {
    const h1 = ref.current;
    if (!h1) return;
    const rows = [...h1.querySelectorAll<HTMLElement>("[data-line-inner]")];
    const letters = rows.map((r) => [...r.querySelectorAll<HTMLElement>("[data-ch]")]);
    const flat = letters.flat();
    const base = flat.map(() => REST);
    const cur = flat.map(() => REST);
    // Whole wdth units only (1 unit ≈ 0.6% width — invisible). Every distinct variation value makes
    // the browser build a new font instance and re-shape the text; continuously changing decimals
    // never hit its font cache, so integer steps are what keep the kinetic headline at 60fps.
    const shown = new WeakMap<HTMLElement, number>();
    const set = (el: HTMLElement, w: number) => {
      const v = Math.round(w);
      if (shown.get(el) === v) return;
      shown.set(el, v);
      el.style.fontVariationSettings = `"wdth" ${v}`;
    };
    let fs = 100;
    let busy = false;
    let settled = false;
    let visible = true;
    let energy = 0;
    let jitterAt = 0;

    const justify = () => {
      busy = true;
      fs = parseFloat(getComputedStyle(h1).fontSize) || fs;
      const target = h1.clientWidth * 0.997;
      let i = 0;
      letters.forEach((ls, li) => {
        let b = li === letters.length - 1 && letters.length > 1 ? ACCENT : REST;
        if (b === REST) {
          ls.forEach((el) => set(el, 84));
          const w84 = rows[li].getBoundingClientRect().width;
          ls.forEach((el) => set(el, 100));
          const slope = (rows[li].getBoundingClientRect().width - w84) / 16;
          if (slope > 0) b = clamp(84 + (target - w84) / slope, 70, 106);
        }
        for (const el of ls) {
          base[i] = cur[i] = b;
          set(el, b);
          i++;
        }
      });
      settled = true;
      busy = false;
    };

    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(justify);
    });
    ro.observe(h1);
    void document.fonts.ready.then(justify);
    document.fonts.addEventListener("loadingdone", justify);

    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(h1);

    // Letter positions are re-measured every 3rd frame, not every frame: each measurement forces a
    // layout of the whole page, and the letters only drift a few px between measurements.
    let frame = 0;
    let rects: DOMRect[] = [];
    const tick = (time: number) => {
      if (busy || !visible || reduced) return;
      const wild = chaosRef.current;
      energy += (clamp(pointer.inside ? pointer.speed / 38 : 0) - energy) * 0.12;
      if (!wild && energy < 0.003 && settled) return;
      if (frame++ % 3 === 0 || rects.length !== flat.length) rects = flat.map((el) => el.getBoundingClientRect());
      const amp = energy * (wild ? 50 : 20);
      let moved = false;
      let i = 0;
      for (const ls of letters) {
        const w = ls.map((_, k) => {
          const r = rects[i + k];
          const dx = (r.left + r.width / 2 - pointer.x) / (fs * 1.5);
          const dy = (r.top + r.height / 2 - pointer.y) / fs;
          return Math.exp(-(dx * dx + dy * dy));
        });
        const mean = w.reduce((a, b) => a + b, 0) / w.length;
        ls.forEach((el, k) => {
          const j = i + k;
          let target = base[j] + amp * (w[k] - mean) * 2.4;
          if (wild) target += Math.sin(time * 2.6 + j * 0.62) * 11;
          const next = cur[j] + (clamp(target, MIN, MAX) - cur[j]) * 0.2;
          // below ~0.06 wdth the change is invisible but still costs a text re-layout
          if (Math.abs(next - cur[j]) > 0.06) {
            cur[j] = next;
            set(el, next);
            moved = true;
          }
        });
        i += ls.length;
      }
      settled = !moved;
      if (wild && time - jitterAt > 0.09) {
        jitterAt = time;
        for (const el of flat) {
          if (Math.random() > 0.22) continue;
          el.style.translate = `${((Math.random() - 0.5) * 0.06).toFixed(3)}em ${((Math.random() - 0.5) * 0.09).toFixed(3)}em`;
          el.style.rotate = `${((Math.random() - 0.5) * 9).toFixed(1)}deg`;
        }
      }
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      cancelAnimationFrame(raf);
      document.fonts.removeEventListener("loadingdone", justify);
      ro.disconnect();
      io.disconnect();
    };
  }, [reduced]);

  // The squiggle scribbles while chaos is on; hovering the accent word redraws it.
  // revertOnUpdate: the endless scribble must die when chaos turns off (else it runs forever and
  // isTweening() blocks the hover redraw).
  const { contextSafe } = useGSAP(
    () => {
      const path = ref.current?.querySelector("[data-squiggle]");
      if (!path || !chaos || reduced) return;
      gsap.fromTo(path, { drawSVG: "0% 100%" }, { drawSVG: "18% 74%", duration: 0.28, ease: "steps(3)", repeat: -1, yoyo: true });
    },
    { scope: ref, dependencies: [chaos, reduced], revertOnUpdate: true },
  );
  const redraw = contextSafe(() => {
    const path = ref.current?.querySelector("[data-squiggle]");
    if (!path || reduced || chaosRef.current || gsap.isTweening(path)) return;
    gsap.fromTo(path, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.75, ease: "power3.inOut" });
  });

  return (
    <h1 ref={ref} aria-label={lines.join(" ")} data-chaos-type className={cn("display", "hero-headline")}>
      {lines.map((line, li) => {
        const accent = li === lines.length - 1 && lines.length > 1;
        const words = line.split(" ");
        return (
          <span key={li} className={cn("hero-row", accent && "hero-row--accent")} onPointerEnter={accent ? redraw : undefined}>
            <span className={"hero-mask"}>
              <span data-line-inner aria-hidden className={cn("hero-line", accent && "hero-accent")}>
                {words.map((word, wi) => (
                  <Fragment key={wi}>
                    <span className={"hero-word"}>
                      {[...word].map((c, ci) => (
                        <span key={ci} data-ch className={"hero-ch"}>
                          {c}
                        </span>
                      ))}
                    </span>
                    {wi < words.length - 1 ? " " : null}
                  </Fragment>
                ))}
              </span>
            </span>
            {accent ? (
              <svg className={"hero-squiggle"} viewBox="0 0 520 64" fill="none" aria-hidden>
                <path data-squiggle d={SQUIGGLE} stroke="currentColor" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : null}
          </span>
        );
      })}
    </h1>
  );
}
