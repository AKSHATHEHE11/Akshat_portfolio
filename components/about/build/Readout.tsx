import { cn } from "@/lib/utils";
import { GROUPS, PARENTS, PROOF, SKILLS } from "./layout";

export type Probe = { kind: "group" | "skill"; i: number } | null;

const USED = SKILLS.filter((s) => s.used).length;

/**
 * The probe's readout: the route from the root, the part's name, its note, and where the résumé shows
 * it in use. Visual only (aria-hidden): every node carries the same facts in its accessible name.
 * Below 1024px it docks to the bottom of the screen as one compact strip (route, name, note).
 */
export function Readout({ probe, wiring, coarse, className }: { probe: Probe; wiring: number[]; coarse: boolean; className?: string }) {
  let route: string[] = [];
  let name = `${GROUPS.length} groups, ${SKILLS.length} parts`;
  let note = `${coarse ? "Tap" : "Point at"} a part to see where I've used it.`;
  let used: string[] = [];
  let count = `${USED} used in work or projects`;
  let misrouted = false;

  if (probe?.kind === "group") {
    const g = GROUPS[probe.i];
    route = [g.label];
    name = g.label;
    note = g.summary;
    count = `${g.parts.length} parts · ${g.parts.filter((p) => p.used).length} used in work or projects`;
  } else if (probe?.kind === "skill") {
    const s = SKILLS[probe.i];
    const via = wiring[probe.i];
    misrouted = via !== PARENTS[probe.i];
    route = [GROUPS[via].label, s.name];
    name = s.name;
    note = s.note ?? GROUPS[s.gi].summary;
    used = s.used?.map((u) => PROOF[u].full) ?? [];
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
      {/* the docked strip on phones keeps to route, name, note: the row itself shows the proof tag */}
      <div key={`s${key}`} className="ab-swap [grid-area:stats] max-lg:hidden lg:mt-6 lg:border-t lg:border-line lg:pt-3">
        {probe?.kind === "skill" ? (
          used.length > 0 && (
            <dl>
              <dt className="label text-fg-muted">Used in</dt>
              {used.map((u) => (
                <dd key={u} className="mt-2 font-medium leading-snug">
                  {u}
                </dd>
              ))}
            </dl>
          )
        ) : (
          <>
            <p className="font-mono text-label text-fg-muted">{count}</p>
            {!probe && (
              <p className="label mt-3 flex flex-wrap gap-x-4 gap-y-2 text-fg-muted">
                <span className="ab-sys-key" data-proof="">
                  Used in work or a project
                </span>
                <span className="ab-sys-key">On the list</span>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
