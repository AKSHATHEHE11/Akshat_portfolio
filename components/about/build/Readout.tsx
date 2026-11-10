import { cn, pad } from "@/lib/utils";
import { Meter } from "../Meter";
import { GROUPS, PARENTS, SKILLS } from "./layout";

export type Probe = { kind: "group" | "skill"; i: number } | null;

/**
 * The probe's readout: the route from the root, the part's name, its note, a level meter and the
 * years. Visual only (aria-hidden): every node carries the same facts in its accessible name.
 * Below 1024px it docks to the bottom of the screen as one compact strip.
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
    route = [g.label];
    name = g.label;
    note = g.summary;
    level = Math.round(g.skills.reduce((a, s) => a + s.level, 0) / g.skills.length);
    years = Math.max(...g.skills.map((s) => s.years));
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
  const key = probe ? `${probe.kind}${probe.i}` : "idle";
  const group = probe?.kind === "group";

  return (
    <div aria-hidden className={cn("ab-sys-readout", className)}>
      <p className="label flex flex-wrap items-center gap-x-2 gap-y-1 text-fg-muted [grid-area:route]">
        <span className="text-fg">Build system</span>
        {route.map((r) => (
          <span key={r} className="contents">
            <span>/</span>
            <span className="text-fg">{r}</span>
          </span>
        ))}
        {misrouted && <span className="ab-sys-flag">Misrouted</span>}
      </p>
      <p
        key={`n${key}`}
        className="ab-swap mt-2 self-end font-display text-[1.375rem] font-[820] uppercase leading-[0.9] tracking-[-0.035em] [font-variation-settings:'wdth'_80] [grid-area:name] lg:mt-3 lg:text-[clamp(1.6rem,1.2rem+1.4vw,2.6rem)]"
      >
        {name}
      </p>
      <p
        key={`t${key}`}
        className={cn(
          "ab-swap mt-1.5 leading-snug [grid-area:note] lg:mt-2",
          group ? "serif-accent text-[1.2rem] lg:text-[1.5rem]" : "text-[0.9375rem] text-fg-muted lg:text-lede",
        )}
      >
        {note}
      </p>
      {/* docked strip: idle has no stats to show (the name gets the row), and phones read the level off the meter */}
      <dl className={cn("flex items-end gap-5 self-end [grid-area:stats] lg:mt-6 lg:gap-6 lg:border-t lg:border-line lg:pt-3", !probe && "max-lg:hidden")}>
        <div>
          <dt className="label text-fg-muted max-lg:hidden">{group ? "Avg level" : "Level"}</dt>
          <dd className="flex items-center gap-2.5 font-mono text-label tabular-nums lg:mt-2">
            <Meter level={level} />
            <span className="max-sm:hidden">{level ? `${level}/5` : "–/5"}</span>
          </dd>
        </div>
        <div>
          <dt className="label text-fg-muted max-lg:hidden">{group ? "Longest" : "Years"}</dt>
          <dd className="font-mono text-[1.125rem] leading-none tabular-nums lg:mt-1 lg:text-[1.5rem]">
            {years === null ? "--" : pad(years)}
            <span className="ml-1 text-label text-fg-muted">yrs</span>
          </dd>
        </div>
      </dl>
    </div>
  );
}
