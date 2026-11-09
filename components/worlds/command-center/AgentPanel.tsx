"use client";
// One agent's wall screen. Idle: a live KPI chart. In session: stance, confidence, the streamed
// argument, the numbers it cites and its objection. Left-wall screens lean right, right-wall screens
// lean left (the `rotate` property); the speaking agent turns to face you.
import { memo, useEffect, useRef, useState, type CSSProperties } from "react";
import { gsap } from "@/lib/gsap";
import { Corners, Led } from "@/components/ui/marks";
import { clamp, cn, seeded } from "@/lib/utils";
import { STANCE_LABEL, type AgentStatus } from "./engine";
import type { AgentTake, BoardAgent, Stance } from "./scene";

const FLICKER: Stance[] = ["for", "against", "conditional"];

export function StanceBadge({ stance, className }: { stance: Stance; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-[4px] px-2 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.12em]",
        stance === "for" && "bg-(--cc-accent) text-[#07090a]",
        stance === "against" && "bg-[#ff5a1f] text-[#07090a]",
        stance === "conditional" && "border border-dashed border-(--cc-fg)/60 text-(--cc-fg)",
        className,
      )}
    >
      {STANCE_LABEL[stance]}
    </span>
  );
}

interface Props {
  agent: BoardAgent;
  index: number;
  side: "left" | "right";
  take: AgentTake | null;
  status: AgentStatus;
  /** characters of the quote on screen */
  shown: number;
  /** the room is on screen (live charts tick) */
  live: boolean;
  chaos: boolean;
  reduced: boolean;
  className?: string;
}

// memo: the session clock re-renders the board 20×/s, but only the seat that is speaking changes
export const AgentPanel = memo(function AgentPanel({ agent, index, side, take, status, shown, live, chaos, reduced, className }: Props) {
  const active = status === "thinking" || status === "speaking";
  const dissent = status === "done" && take?.stance === "against";
  return (
    <article
      data-cc-panel
      aria-labelledby={`cc-agent-${agent.id}`}
      className={cn(
        "cc-shake relative flex min-h-[21rem] flex-col overflow-hidden rounded-[4px] border bg-[linear-gradient(160deg,rgb(216_255_0/0.045),rgb(233_240_234/0.015)_45%,rgb(0_0_0/0.25))] p-4 md:p-5",
        // opacity is left to GSAP (power-on intro); the waiting dim lives on the inner wrapper
        "transition-[rotate,border-color,box-shadow] duration-700 ease-out-expo",
        side === "left" ? "xl:origin-left" : "xl:origin-right",
        !active && (side === "left" ? "xl:[rotate:y_9deg]" : "xl:[rotate:y_-9deg]"),
        active
          ? "border-(--cc-accent)/80 shadow-[0_0_0_1px_rgb(216_255_0/0.3),0_0_56px_-14px_rgb(216_255_0/0.6)]"
          : dissent
            ? "border-[#ff5a1f]/80 shadow-[0_0_44px_-16px_rgb(255_90_31/0.75)]"
            : "border-(--cc-fg)/12",
        className,
      )}
      style={{ "--cc-delay": `${-index * 0.09}s` } as CSSProperties}
    >
      <Corners className="text-(--cc-accent)/40" size={10} inset={6} weight={1} />
      {status === "thinking" && <span aria-hidden className="cc-think absolute inset-0" />}
      <header key={active ? "on" : "off"} className={cn("flex items-start justify-between gap-3", active && "cc-flicker")}>
        <div>
          <h3
            id={`cc-agent-${agent.id}`}
            className="font-display text-[2.6rem] font-[820] leading-[0.78] tracking-[-0.045em] [font-variation-settings:'wdth'_118]"
          >
            {agent.role}
          </h3>
          <p className="mt-2 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--cc-fg)/60">{agent.seat} seat</p>
        </div>
        <StatusChip status={status} dissent={dissent} />
      </header>
      {/* waiting seats dim their screen, not their name plate */}
      <div className={cn("mt-4 flex flex-1 flex-col transition-opacity duration-500", status === "waiting" && "opacity-45")}>
        {take && status !== "idle" ? (
          <Take take={take} status={status} shown={shown} chaos={chaos} />
        ) : (
          <Kpi agent={agent} index={index} live={live && !reduced} chaos={chaos} reduced={reduced} />
        )}
      </div>
    </article>
  );
});

function StatusChip({ status, dissent }: { status: AgentStatus; dissent: boolean }) {
  const [text, tone] = {
    idle: ["Live", "go"],
    waiting: ["Waiting", "fg"],
    thinking: ["Thinking", "accent"],
    speaking: ["Has the floor", "accent"],
    done: dissent ? ["Dissent", "signal"] : ["Filed", "fg"],
  }[status] as [string, "go" | "fg" | "accent" | "signal"];
  return (
    <span className="mt-1 flex shrink-0 items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--cc-fg)/75">
      <Led tone={tone} pulse={status === "idle" || status === "speaking"} className={cn(status === "waiting" && "opacity-40")} />
      {text}
    </span>
  );
}

/** Idle: the agent's own KPI, ticking. */
function Kpi({ agent, index, live, chaos, reduced }: { agent: BoardAgent; index: number; live: boolean; chaos: boolean; reduced: boolean }) {
  const [series, setSeries] = useState(agent.kpi.series);
  const tick = useRef(0);
  const heckle = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!live) return;
    const base = agent.kpi.series[agent.kpi.series.length - 1];
    const id = window.setInterval(
      () => {
        const k = ++tick.current;
        setSeries((s) => {
          const last = s[s.length - 1];
          const next = clamp(last + (seeded(k * 13 + index * 101) - 0.5) * (chaos ? 0.5 : 0.16) + (base - last) * 0.25, 0.1, 0.98);
          return [...s.slice(1), next];
        });
      },
      chaos ? 240 : 1400,
    );
    return () => window.clearInterval(id);
  }, [live, chaos, agent.kpi.series, index]);

  // chaos: the agent heckles the room
  useEffect(() => {
    const el = heckle.current;
    if (!chaos || !el) return;
    let i = index;
    // reduced motion: the heckles still change, they just don't decode
    const say = () => gsap.to(el, { duration: reduced ? 0 : 0.7, scrambleText: { text: agent.heckles[i++ % agent.heckles.length], chars: "!?#%&*/<>", speed: 0.9 } });
    say();
    const id = window.setInterval(say, 2600 + index * 230);
    return () => {
      window.clearInterval(id);
      gsap.killTweensOf(el);
    };
  }, [chaos, reduced, agent.heckles, index]);

  return (
    <>
      <div className="flex items-end justify-between gap-3">
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-(--cc-fg)/55">{agent.kpi.label}</p>
        <p className="font-display text-[2rem] font-[300] leading-none tracking-[-0.02em] text-(--cc-accent) tabular-nums [font-variation-settings:'wdth'_72]">
          {agent.kpi.value}
        </p>
      </div>
      <div aria-hidden className="mt-3 flex min-h-24 flex-1 items-end gap-[3px] border-b border-(--cc-fg)/15">
        {series.map((v, i) => (
          <span
            key={i}
            className="h-full flex-1 origin-bottom bg-(--cc-accent) transition-transform duration-700 ease-out-expo"
            style={{ transform: `scaleY(${v})`, opacity: i === series.length - 1 ? 1 : 0.18 + (i / series.length) * 0.4 }}
          />
        ))}
      </div>
      {chaos ? (
        <p ref={heckle} aria-hidden className="mt-3 min-h-[1.25rem] font-mono text-[0.8125rem] text-[#ff7a45]" />
      ) : (
        <p className="mt-3 text-[0.8125rem] leading-snug text-(--cc-fg)/60">
          Judged on <span className="text-(--cc-fg)/90">{agent.judgedOn.toLowerCase()}</span>
        </p>
      )}
    </>
  );
}

/** In session: the agent's take, streamed. */
function Take({ take, status, shown, chaos }: { take: AgentTake; status: AgentStatus; shown: number; chaos: boolean }) {
  const speaking = status === "speaking";
  const done = status === "done";
  const revealed = speaking || done;
  // chaos: the stance can't make up its mind until the agent stops talking
  const stance = revealed ? (chaos && speaking ? FLICKER[(shown >> 3) % 3] : take.stance) : null;
  return (
    <>
      <div className="flex items-center gap-3">
        {stance ? <StanceBadge stance={stance} /> : <span className="h-6 w-20 rounded-[4px] border border-(--cc-fg)/15" />}
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--cc-fg)/60">Conf</span>
        <span className="relative h-1 flex-1 overflow-hidden bg-(--cc-fg)/10">
          <span
            className="absolute inset-0 origin-left bg-(--cc-accent) transition-transform duration-1000 ease-out-expo"
            style={{ transform: `scaleX(${revealed ? take.confidence / 100 : 0})` }}
          />
        </span>
        <span className="w-9 text-right font-mono text-[0.75rem] tabular-nums">{revealed ? `${take.confidence}%` : "--"}</span>
      </div>

      <blockquote className="relative mt-3 font-serif text-[1.125rem] italic leading-[1.28]">
        {/* the full quote reserves the space so the panel never jumps while text streams */}
        <span aria-hidden className="invisible">“{take.quote}”</span>
        <span aria-hidden className={cn("absolute inset-0", speaking && "cc-caret", chaos && speaking && "cc-glitch")}>
          {revealed && `“${take.quote.slice(0, shown)}${done ? "”" : ""}`}
        </span>
        {status === "waiting" && (
          <span className="absolute inset-0 font-mono text-[0.6875rem] uppercase not-italic tracking-[0.14em] text-(--cc-fg)/60">
            Waiting for the floor
          </span>
        )}
        {status === "thinking" && (
          <span className="cc-dots absolute inset-0 font-mono text-[0.6875rem] uppercase not-italic tracking-[0.14em] text-(--cc-accent)">
            Reading the numbers<span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        )}
        {done && <span className="sr-only">{take.quote}</span>}
      </blockquote>

      <ul
        aria-label="Cited"
        className={cn("mt-3 flex flex-wrap gap-1.5 transition-[opacity,translate] duration-500 ease-out-expo", done ? "opacity-100" : "translate-y-1 opacity-0")}
      >
        {take.cites.map((c) => (
          <li key={c} className="rounded-[4px] border border-(--cc-accent)/30 bg-(--cc-accent)/[0.06] px-2 py-1 font-mono text-[0.6875rem] leading-tight text-(--cc-fg)/90">
            {c}
          </li>
        ))}
      </ul>
      <p
        className={cn(
          "mt-auto pt-3 text-[0.8125rem] leading-snug transition-opacity delay-150 duration-500",
          done ? "opacity-100" : "opacity-0",
          take.stance === "against" ? "text-[#ff8a5c]" : "text-(--cc-fg)/75",
        )}
      >
        <span className="mr-2 font-mono text-[0.6875rem] uppercase tracking-[0.14em] opacity-70">Objection</span>
        {take.objection}
      </p>
    </>
  );
}
