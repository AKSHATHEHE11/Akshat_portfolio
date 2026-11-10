import { cn, pad } from "@/lib/utils";
import { Meter } from "../Meter";
import { GROUPS, PARENTS, SKILLS } from "./layout";

export type Probe = { kind: "group" | "skill"; i: number } | null;

/**
 * The probe's readout: the route from the root, the part's name, its note, a level meter and the
 * years. Visual only (aria-hidden): every node carries the same facts in its accessible name.
 */
export function Readout({ probe, wiring, coarse, className }: { probe: Probe; wiring: number[]; coarse: boolean; className?: string }) {
  let route: string[] = [];
  let name = `${GROUPS.length} groups, ${SKILLS.length} parts`;
  let note = coarse ? "Tap a part to trace its wire back to the root." : "Point at a part to trace its wire back to the root.";
  let level = 0;
  let years: number | null = null;
  let misrouted = false;

  if (probe?.kind === "group") {
    const g = GROUPS[probe.i];
    const parts = g.skills;
    route = [g.label];
    name = g.label;
    note = g.summary;
    level = Math.round(parts.reduce((a, s) => a + s.level, 0) / parts.length);
    years = Math.max(...parts.map((s) => s.years));
  } else if (probe?.kind === "skill") {
    const s = SKILLS[probe.i];
    const via = wiring[probe.i];
    misrouted = via !== PARENTS[probe.i];
    route = [GROUPS[via].label, s.name];
    name = s.name;
    note = s.note;
    level = s.level;
    years = s.years;
  }

  return (
    <div aria-hidden className={cn("ab-sys-readout", className)}>
      <p className="label flex flex-wrap items-center gap-x-2 gap-y-1 text-fg-muted">
        <span className="text-fg">Build system</span>
        {route.map((r) => (
          <span key={r} className="contents">
            <span>/</span>
            <span className="text-fg">{r}</span>
          </span>
        ))}
        {misrouted && <span className="ab-sys-flag">Misrouted</span>}
      </p>
      <div key={probe ? `${probe.kind}${probe.i}` : "idle"} className="ab-swap">
        <p className="mt-3 font-display text-[clamp(1.6rem,1.2rem+1.4vw,2.6rem)] font-[820] uppercase leading-[0.9] tracking-[-0.035em] [font-variation-settings:'wdth'_80] max-lg:text-[1.375rem]">
          {name}
        </p>
        <p className={cn("mt-2 leading-snug text-fg-muted max-lg:text-[0.9375rem]", probe?.kind === "group" ? "serif-accent text-[1.5rem] text-fg max-lg:text-[1.2rem]" : "text-lede")}>{note}</p>
      </div>
      <dl className="mt-4 flex items-end gap-6 border-t border-line pt-3 lg:mt-6">
        <div>
          <dt className="label text-fg-muted">{probe?.kind === "group" ? "Avg level" : "Level"}</dt>
          <dd className="mt-2 flex items-center gap-2.5 font-mono text-label tabular-nums">
            <Meter level={level} />
            {level ? `${level}/5` : "–/5"}
          </dd>
        </div>
        <div>
          <dt className="label text-fg-muted">{probe?.kind === "group" ? "Longest" : "Years"}</dt>
          <dd className="mt-1 font-mono text-[1.5rem] leading-none tabular-nums">
            {years === null ? "--" : pad(years)}
            <span className="ml-1 text-label text-fg-muted">yrs</span>
          </dd>
        </div>
      </dl>
    </div>
  );
}
