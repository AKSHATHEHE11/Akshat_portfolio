"use client";
// "Ask the board" — the working product inside the room. Owns the session clock and lays out the
// room: CEO/CFO on the left wall, COO/CMO on the right, the globe and the table console between them.
// Small screens: globe → console → a swipeable row of agent screens that follows whoever is talking.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { useChaos, useMediaQuery, useOnScreen, useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import type { ProjectColor } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AgentPanel } from "./AgentPanel";
import { charsAt, matchScenario, schedule, statusAt, type AgentStatus, type Mode, type Plan } from "./engine";
import { Brief } from "./Brief";
import { Console } from "./Console";
import { Globe, type GlobeArc } from "./Globe";
import type { CommandCenterScene } from "./scene";

interface Run {
  id: number;
  index: number;
  asked: string;
  exact: boolean;
  plan: Plan;
}

const WIDE = "(min-width: 1280px)";

export function Board({ scene, color, title }: { scene: CommandCenterScene; color: ProjectColor; title: string }) {
  const chaos = useChaos();
  const reduced = useReducedMotion();
  const lenis = useLenis();
  const root = useRef<HTMLDivElement>(null);
  const live = useOnScreen(root);
  // phones: the seats are a swipe row — keyboard users need to be able to scroll it too
  const swipeRow = useMediaQuery("(max-width: 767.98px)");
  const rail = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const briefRef = useRef<HTMLElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const seq = useRef(0);
  const order = useMemo(() => scene.agents.map((a) => a.id), [scene.agents]);

  const [run, setRun] = useState<Run | null>(null);
  const [t, setT] = useState(0);
  const [skipped, setSkipped] = useState(false);

  // the session clock: 20 ticks a second until the brief is due
  useEffect(() => {
    if (!run || skipped) return;
    const start = performance.now();
    const id = window.setInterval(() => {
      const e = performance.now() - start;
      setT(e);
      if (e > run.plan.brief) window.clearInterval(id);
    }, 50);
    return () => window.clearInterval(id);
  }, [run, skipped]);

  const scenario = run ? scene.scenarios[run.index] : null;
  const time = skipped ? Number.POSITIVE_INFINITY : t;
  const phase = !run ? "idle" : time >= run.plan.brief ? "brief" : "session";
  const statuses = order.map((id) => statusAt(run?.plan ?? null, id, time));
  const sig = statuses.join(" ");

  const convene = useCallback(
    (text: string, index?: number, exact?: boolean) => {
      const m = index === undefined ? matchScenario(text, scene.scenarios) : { index, exact: exact ?? true };
      const mode: Mode = reduced ? "reduced" : chaos ? "chaos" : "calm";
      seq.current += 1;
      setT(0);
      setSkipped(false);
      setRun({
        id: seq.current,
        index: m.index,
        asked: text.trim() || scene.scenarios[m.index].prompt,
        exact: m.exact,
        plan: schedule(scene.scenarios[m.index], order, mode),
      });
      play(chaos ? "glitch" : "open");
      // stacked layout: bring the console and the first agent screen into view
      if (slot.current && !window.matchMedia(WIDE).matches) lenis?.scrollTo(slot.current, { offset: -88 });
    },
    [scene.scenarios, order, reduced, chaos, lenis],
  );

  const reset = useCallback(() => {
    setRun(null);
    setSkipped(false);
    setT(0);
    play("close");
    requestAnimationFrame(() => input.current?.focus({ preventScroll: true }));
  }, []);

  // the room's sounds: a click when an agent takes the floor, a toggle when a stance is filed
  const prev = useRef(sig);
  useEffect(() => {
    const before = prev.current.split(" ");
    prev.current = sig;
    if (!scenario) return;
    sig.split(" ").forEach((s, i) => {
      if (s === before[i]) return;
      if (s === "speaking") play("click");
      if (s === "done") play(scenario.takes[order[i]].stance === "against" ? "toggle-off" : "toggle-on");
    });
  }, [sig, scenario, order]);
  useEffect(() => {
    if (sig.includes("speaking")) play("type");
  }, [t, sig]);

  // brief: success chime, and bring it on screen — unless the visitor has scrolled away from the board
  useEffect(() => {
    if (phase !== "brief") return;
    play("success");
    const el = briefRef.current;
    const board = root.current?.getBoundingClientRect();
    if (!el || !board || board.bottom < 0 || board.top > window.innerHeight) return;
    const r = el.getBoundingClientRect();
    if (r.top < 64 || r.top > window.innerHeight * 0.6) lenis?.scrollTo(el, { offset: -96 });
  }, [phase, lenis]);

  // swipe row follows whoever has the floor
  const activeIdx = statuses.findIndex((s) => s === "speaking" || s === "thinking");
  useEffect(() => {
    const r = rail.current;
    if (!r || activeIdx < 0 || r.scrollWidth <= r.clientWidth + 4) return;
    const el = r.children[activeIdx] as HTMLElement | undefined;
    if (el) r.scrollTo({ left: el.offsetLeft - (r.clientWidth - el.clientWidth) / 2, behavior: reduced ? "auto" : "smooth" });
  }, [activeIdx, reduced]);

  const arcs = useMemo<GlobeArc[]>(() => {
    if (!run || !scenario) return [];
    const st = sig.split(" ");
    return order.flatMap((id, i) => {
      if (st[i] !== "speaking" && st[i] !== "done") return [];
      const take = scenario.takes[id];
      return take.regions.map((to) => ({ key: `${run.id}:${id}:${to}`, to, tone: take.stance === "against" ? ("alert" as const) : ("lime" as const) }));
    });
  }, [run, scenario, order, sig]);

  const speakers = statuses.flatMap((s, i) => (s === "speaking" ? [scene.agents[i].role] : []));
  const role = (s: AgentStatus) => scene.agents[statuses.indexOf(s)]?.role;
  const announce = !scenario
    ? `Board idle · ${scene.agents.length} seats · deterministic demo`
    : phase === "brief"
      ? `Brief filed — ${scenario.brief.verdict}`
      : speakers.length > 1
        ? "Everyone has the floor. Nobody yields."
        : speakers.length
          ? `${speakers[0]} has the floor`
          : role("thinking")
            ? `${role("thinking")} is reading the numbers`
            : !statuses.includes("done")
              ? "Convening the board"
              : role("waiting")
                ? `Floor passes to the ${role("waiting")}`
                : "Every seat has filed · drafting the brief";

  return (
    <div ref={root} data-cc-board className="relative grid grid-cols-1 gap-(--gutter) xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)] xl:[perspective:1600px]">
      {/* centre: globe on its projector, the table console, the brief when it prints */}
      <div className="relative flex flex-col xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:-mt-[12vw]">
        <div data-cc-boot className="mx-auto w-full max-w-[34rem] xl:max-w-none">
          <Globe cities={scene.cities} hq={scene.room.hq} focus={scenario?.focus ?? null} arcs={arcs} chaos={chaos} />
        </div>
        <div ref={slot} data-cc-boot className="relative -mt-6 scroll-mt-24 md:-mt-10 xl:mt-auto">
          <Console
            scenarios={scene.scenarios}
            agents={scene.agents}
            statuses={statuses}
            phase={phase}
            asked={run?.asked ?? null}
            matched={scenario}
            exact={run?.exact ?? true}
            announce={announce}
            inputRef={input}
            onConvene={convene}
            onSkip={() => setSkipped(true)}
            className={cn(phase === "brief" && "max-xl:hidden xl:invisible")}
          />
        </div>
        {phase === "brief" && run && scenario && (
          <Brief
            ref={briefRef}
            scene={scene}
            scenario={scenario}
            asked={run.asked}
            exact={run.exact}
            color={color}
            chaos={chaos}
            reduced={reduced}
            title={title}
            onReplay={() => convene(run.asked, run.index, run.exact)}
            onReset={reset}
            className="scroll-mt-24 xl:absolute xl:inset-x-0 xl:bottom-0 xl:top-[12vw]"
          />
        )}
      </div>

      {/* the walls: four agent screens */}
      <div
        ref={rail}
        role="group"
        aria-label="The board"
        tabIndex={swipeRow ? 0 : undefined}
        // ←/→ scroll the row; they must not also switch worlds (the shell honours this opt-out)
        data-arrows="local"
        className="no-scrollbar relative -mx-(--margin) flex snap-x snap-mandatory gap-3 overflow-x-auto px-(--margin) pb-1 focus-visible:outline-offset-[-2px] md:mx-0 md:grid md:grid-cols-2 md:gap-(--gutter) md:overflow-visible md:px-0 xl:contents"
      >
        {scene.agents.map((a, i) => {
          const status = statuses[i];
          const take = scenario?.takes[a.id] ?? null;
          return (
            <AgentPanel
              key={a.id}
              agent={a}
              index={i}
              side={i < 2 ? "left" : "right"}
              take={take}
              status={status}
              shown={run && take ? charsAt(run.plan, a.id, time, take.quote.length) : 0}
              live={live}
              chaos={chaos}
              reduced={reduced}
              className={cn(
                "w-[84vw] max-w-[23rem] shrink-0 snap-center md:w-auto md:max-w-none",
                i < 2 ? "xl:col-start-1" : "xl:col-start-3",
                i % 2 === 0 ? "xl:row-start-1" : "xl:row-start-2",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
