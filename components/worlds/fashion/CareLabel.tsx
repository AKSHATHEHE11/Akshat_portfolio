"use client";
// Technology as a woven care label sewn into a denim seam. Each tool is a care instruction with
// its own laundry symbol; hover, focus or tap one and the care guide beside it explains the "why".
// The label sways with the cursor (pendulum) and flaps in chaos.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { gsap } from "@/lib/gsap";
import { useChaos, useOnScreen, useReducedMotion } from "@/lib/hooks";
import { BEZIER } from "@/lib/motion";
import { pointer } from "@/lib/pointer";
import { play } from "@/lib/sound";
import type { Tech, TechGroup } from "@/lib/types";
import { clamp, cn } from "@/lib/utils";
import { useFabric } from "./fabric";
import { ECRU } from "./kit";
import type { FashionScene } from "./scene";

/** The care instruction each kind of tool gets — the metaphor, not the content. */
const CARE: Record<TechGroup, string> = {
  frontend: "Machine wash 30°",
  backend: "Professional clean only",
  cloud: "Tumble dry, low heat",
  motion: "Iron on medium",
  ai: "Bleach only when needed",
  design: "Dry in the shade",
  data: "Dry flat",
};

export function CareLabel({ tech, label }: { tech: Tech[]; label: FashionScene["label"] }) {
  const root = useRef<HTMLElement>(null);
  const tag = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  const chaos = useChaos();
  const onScreen = useOnScreen(root, "0px");
  const seam = useFabric({ warp: "#1f2a44", weft: ECRU, weave: "twill-3x1", size: 192, fade: 0.2 });
  const t = tech[active] ?? tech[0];

  // pendulum: the cursor's sideways speed pushes the label; chaos adds gusts
  useEffect(() => {
    const el = tag.current;
    if (!el || reduced || !onScreen) return;
    let th = 0;
    let om = 0;
    const tick = (_: number, ms: number) => {
      const dt = Math.min(ms / 1000, 1 / 30);
      const r = el.getBoundingClientRect();
      const near = pointer.inside && pointer.x > r.left - 60 && pointer.x < r.right + 60 && pointer.y > r.top - 20 && pointer.y < r.bottom;
      let force = near ? pointer.vx * 0.5 : 0;
      if (chaos) force += Math.sin(performance.now() / 140) * 9 + (Math.random() - 0.5) * 30;
      om += (-26 * th - 2.2 * om + force) * dt;
      th = clamp(th + om * dt, -0.5, 0.5);
      el.style.transform = `rotate(${th}rad)`;
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      el.style.transform = "";
    };
  }, [reduced, onScreen, chaos]);

  const pick = (i: number) => {
    if (i === active) return;
    play("tick");
    setActive(i);
  };

  return (
    <section ref={root} id="care" aria-labelledby="fy-care" className="relative px-(--margin) py-24 lg:py-36">
      <div className="mx-auto grid max-w-(--frame-max) gap-12 lg:grid-cols-12 lg:gap-(--gutter)">
        <div className="lg:col-span-4">
          <h2 id="fy-care" data-chaos-type className="font-serif text-[clamp(3rem,1.6rem+5vw,7.5rem)] italic leading-[0.82] tracking-[-0.025em]">
            Care label
          </h2>
          <p className="mt-5 max-w-[28ch] font-serif text-[1.35rem] italic leading-tight">What the garment is made of, and how each part wants to be treated.</p>
        </div>

        {/* the label, sewn into a denim seam */}
        <div className="relative flex justify-center pt-10 lg:col-span-4">
          <div aria-hidden className="absolute inset-x-[-4vw] top-0 h-12 lg:inset-x-0" style={{ backgroundColor: "#1f2a44", backgroundImage: seam ? `url(${seam})` : undefined, backgroundSize: "96px" }}>
            <span className={cn("fy-stitch", "absolute inset-x-0 top-3 h-px text-[#c4823b]")} />
            <span className={cn("fy-stitch", "absolute inset-x-0 bottom-3 h-px text-[#c4823b]")} />
          </div>
          <div ref={tag} className="relative z-[1] w-[min(100%,19rem)] origin-top will-change-transform">
            <div className={cn("fy-woven", "relative px-5 pb-10 pt-7 text-[#14161c] shadow-[0_24px_40px_-24px_rgb(0_0_0/0.55)]")} style={{ clipPath: "polygon(0 0,100% 0,100% 100%,50% calc(100% - 14px),0 100%)" }}>
              <span aria-hidden className="absolute inset-x-0 top-0 h-3 bg-black/10" />
              <span aria-hidden className="absolute inset-2 top-4 border border-dashed border-[#14161c]/20" />
              <div className={cn("fy-woven-text", "text-center text-[0.8125rem] leading-[1.7]")}>
                {label.header.map((l) => (
                  <p key={l} className={l === label.header[0] ? "font-serif text-[1.5rem] normal-case italic tracking-normal" : ""}>
                    {l}
                  </p>
                ))}
                <div className="mx-auto my-3 h-px w-10 bg-current/40" />
                {label.composition.map((l) => (
                  <p key={l}>{l}</p>
                ))}
              </div>
              <ul className="mt-5 border-t border-[#14161c]/15" aria-label="Technology — choose one">
                {tech.map((x, i) => (
                  <li key={x.name}>
                    <button
                      type="button"
                      aria-pressed={i === active}
                      onPointerEnter={(e) => e.pointerType === "mouse" && pick(i)}
                      onFocus={() => pick(i)}
                      onClick={() => pick(i)}
                      data-cursor="hover"
                      className={cn(
                        "flex w-full items-center gap-3 border-b border-[#14161c]/15 py-2.5 text-left transition-colors coarse:py-3",
                        i === active ? "bg-[#14161c] text-[#f3efe4]" : "hover:bg-[#14161c]/5",
                      )}
                    >
                      <CareSymbol group={x.group} className="ml-1.5 size-7 shrink-0" />
                      <span className={cn("fy-woven-text", "text-[0.8125rem]")}>{x.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className={cn("fy-woven-text", "mt-5 text-center text-[0.6875rem] leading-[1.8] opacity-80")}>
                {label.footer.map((l) => (
                  <p key={l}>{l}</p>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* the care guide */}
        <div className="lg:col-span-4 lg:pt-10" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={t?.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: BEZIER.out }}
              className="border-t border-(--fy-fg)/20 pt-6"
            >
              {t ? (
                <>
                  <CareSymbol group={t.group} className="size-20 text-(--fy-fg)" />
                  <p className="mt-5 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--fy-muted)">
                    {t.group} — {CARE[t.group]}
                  </p>
                  <h3 className="mt-2 font-serif text-[clamp(2.2rem,1.6rem+1.8vw,3.4rem)] italic leading-[0.92]">{t.name}</h3>
                  <p className="mt-4 max-w-[32ch] text-lede leading-snug">{t.why}</p>
                </>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

/** Laundry symbols, drawn to the ISO 3758 shapes. */
function CareSymbol({ group, className }: { group: TechGroup; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  let body: ReactNode;
  switch (group) {
    case "frontend":
      body = (
        <>
          <path d="M4 11l3.2 15h17.6L28 11" {...common} />
          <path d="M4 11c2-2 4-2 6 0s4 2 6 0 4-2 6 0 4 2 6 0" {...common} />
          <text x="16" y="23" textAnchor="middle" fontSize="7.5" fontFamily="var(--font-mono)" fill="currentColor">
            30
          </text>
        </>
      );
      break;
    case "backend":
      body = (
        <>
          <circle cx="16" cy="16" r="11" {...common} />
          <text x="16" y="20" textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fill="currentColor">
            P
          </text>
        </>
      );
      break;
    case "cloud":
      body = (
        <>
          <rect x="5" y="5" width="22" height="22" {...common} />
          <circle cx="16" cy="16" r="8" {...common} />
          <circle cx="16" cy="16" r="1.4" fill="currentColor" />
        </>
      );
      break;
    case "motion":
      body = (
        <>
          <path d="M5 24h22c0-6.5-3.5-11-10-11h-6.5c-1.4 0-2.5 1.1-2.5 2.5" {...common} />
          <path d="M10.5 13l1-4h9" {...common} />
          <circle cx="13.5" cy="19.5" r="1.1" fill="currentColor" />
          <circle cx="18.5" cy="19.5" r="1.1" fill="currentColor" />
        </>
      );
      break;
    case "ai":
      body = <path d="M16 5l11.5 21h-23z" {...common} />;
      break;
    case "design":
      body = (
        <>
          <rect x="5" y="5" width="22" height="22" {...common} />
          <path d="M5 10c4 4 18 4 22 0" {...common} />
          <path d="M5 5l6 6" {...common} />
        </>
      );
      break;
    default:
      body = (
        <>
          <rect x="5" y="5" width="22" height="22" {...common} />
          <path d="M10 16h12" {...common} />
        </>
      );
  }
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      {body}
    </svg>
  );
}
