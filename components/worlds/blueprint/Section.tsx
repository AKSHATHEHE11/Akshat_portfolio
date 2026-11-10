"use client";
// Sheet A-401: section A–A through Block B, where the stack is the building. Design is the roof,
// the front end the floors people walk through, the back end the ground floor, data the basement and
// the servers the foundation. Every room is a technology: hover, focus or tap it for why it's there.
// Chaos: the floors slip off their slabs.
import { useRef, useState, type CSSProperties } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import type { Tech, TechGroup } from "@/lib/types";
import { cn, seeded } from "@/lib/utils";
import { ViewTitle } from "./kit";

/** Top to bottom. Groups below the ground line are underground. */
const FLOORS: { group: TechGroup; name: string; below?: boolean }[] = [
  { group: "design", name: "Roof" },
  { group: "motion", name: "Roof" },
  { group: "frontend", name: "Upper floors" },
  { group: "ai", name: "Plant room" },
  { group: "backend", name: "Ground floor" },
  { group: "data", name: "Basement", below: true },
  { group: "cloud", name: "Foundation", below: true },
];
const STOREY = 3.6; // metres floor to floor
const DEPTH = 3.2; // metres per level below ground

const level = (n: number) => (n === 0 ? "±0.00" : `${n > 0 ? "+" : "−"}${Math.abs(n).toFixed(2)}`);

export function Section({ technologies }: { technologies: Tech[] }) {
  const ref = useRef<HTMLElement>(null);
  const [pinned, setPinned] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const reduced = useReducedMotion();

  // built from the foundation up when the sheet arrives
  useGSAP(
    () => {
      if (reduced) return;
      gsap
        .timeline({ scrollTrigger: { trigger: ref.current, start: "top 70%", once: true } })
        .from(".bp-ground", { scaleX: 0, duration: 0.8, ease: "power3.inOut" })
        .from(".bp-floor", { autoAlpha: 0, y: 28, duration: 0.6, ease: "expo.out", stagger: { each: 0.12, from: "end" }, clearProps: "transform,opacity,visibility" }, 0.3);
    },
    { scope: ref, dependencies: [reduced], revertOnUpdate: true },
  );

  const floors = FLOORS.map((f) => ({ ...f, techs: technologies.map((t, i) => ({ t, i })).filter((x) => x.t.group === f.group) })).filter((f) => f.techs.length);
  const above = floors.filter((f) => !f.below);
  const below = floors.filter((f) => f.below);
  const active = hover ?? pinned;
  const tech = technologies[active];
  const floorOf = floors.find((f) => f.techs.some((x) => x.i === active));

  const room = ({ t, i }: { t: Tech; i: number }) => (
    <button
      key={t.name}
      type="button"
      className={cn("bp-rm", i === active && "is-on")}
      aria-pressed={i === pinned}
      aria-describedby={i === active ? "bp-sec-why" : undefined}
      onClick={() => {
        if (i !== pinned) play("click");
        setPinned(i);
      }}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        play("tick");
        setHover(i);
      }}
      onPointerLeave={() => setHover(null)}
      onFocus={() => setHover(i)}
      onBlur={() => setHover(null)}
      data-cursor="hover"
    >
      <span className="bp-rm-n">{String(i + 1).padStart(2, "0")}</span>
      <span className="bp-rm-t">{t.name}</span>
    </button>
  );

  /** One storey: its rooms, and the level of its floor line (k counts down from the roof / ground). */
  const floorRow = (f: (typeof floors)[number], k: number) => {
    const g = floors.indexOf(f);
    const style = {
      "--tilt": `${((seeded(g + 11) - 0.5) * 7).toFixed(1)}deg`,
      "--slide": `${Math.round((seeded(g + 29) - 0.5) * 60)}px`,
      "--g": g,
    } as CSSProperties;
    return (
      <li key={f.group} className={cn("bp-floor", `bp-floor-${f.group}`, f === above[0] && "is-roof", f === floorOf && "is-lit")} style={style}>
        {f === above[0] && (
          <svg aria-hidden viewBox="0 0 100 20" preserveAspectRatio="none" className="bp-roof">
            <path d="M0 20L50 1L100 20" vectorEffect="non-scaling-stroke" />
          </svg>
        )}
        <div className="bp-rooms" style={{ "--n": f.techs.length } as CSSProperties}>
          {f.techs.map(room)}
        </div>
        <p className="bp-lvl">
          <span className="bp-lvl-mark" aria-hidden />
          <b>{level(f.below ? -DEPTH * (k + 1) : STOREY * (above.length - 1 - k))}</b>
          <span>
            {f.name} · {f.group}
          </span>
        </p>
      </li>
    );
  };

  return (
    <section ref={ref} aria-labelledby="bp-sec" className="bp-sheet bp-sec frame">
      <div className="bp-sec-head">
        <ViewTitle n={6} sheet="A-401" id="bp-sec" scale="1 : 100">
          Section A–A
        </ViewTitle>
        <p className="bp-instr">Cut through Block B. The stack is the building; every room has a reason to be there.</p>
      </div>

      <div className="bp-sec-draw">
        <ol className="bp-floors" aria-label="Stack, top to bottom">
          {above.map((f, k) => floorRow(f, k))}
        </ol>
        <div className="bp-ground" aria-hidden>
          <span>Ground {level(0)}</span>
        </div>
        {below.length > 0 && (
          <ol className="bp-floors bp-below" aria-label="Below ground">
            {below.map((f, k) => floorRow(f, k))}
          </ol>
        )}
      </div>

      <aside className="bp-sec-note">
        <p className="bp-sec-note-k">
          Room {String(active + 1).padStart(2, "0")} · {floorOf?.name}
        </p>
        <p className="bp-sec-note-t">{tech?.name}</p>
        <p id="bp-sec-why" className="bp-sec-note-why" key={active}>
          {tech?.why ?? `${tech?.name} holds up the ${tech?.group} floor.`}
        </p>
      </aside>
    </section>
  );
}
