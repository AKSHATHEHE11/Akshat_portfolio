"use client";
// The deliverable: a one-page decision brief that prints out of the table when the last agent files.
// Paper inverts the room's palette (the only light surface in the world), so shared components inside
// get the swapped semantic tokens.
import { useEffect, useRef, useState, type CSSProperties, type Ref } from "react";
import { Check, Copy, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { gsap, useGSAP } from "@/lib/gsap";
import { play } from "@/lib/sound";
import { emit } from "@/lib/system";
import type { ProjectColor } from "@/lib/types";
import { cn } from "@/lib/utils";
import { STANCE_LABEL, tally } from "./engine";
import { StanceBadge } from "./AgentPanel";
import type { CommandCenterScene, Scenario } from "./scene";

interface Props {
  ref?: Ref<HTMLElement>;
  scene: CommandCenterScene;
  scenario: Scenario;
  asked: string;
  exact: boolean;
  color: ProjectColor;
  chaos: boolean;
  reduced: boolean;
  /** product name for the copied brief's sign-off */
  title: string;
  onReplay: () => void;
  onReset: () => void;
  className?: string;
}

export function Brief({ ref, scene, scenario, asked, exact, color, chaos, reduced, title, onReplay, onReset, className }: Props) {
  const sheet = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [copied, setCopied] = useState(false);
  const { room, agents } = scene;
  const { brief } = scenario;
  const votes = tally(scenario, agents.map((a) => a.id));
  const dissenter = agents.find((a) => a.id === brief.dissent.agent);
  const number = `${room.briefNo}-${scenario.id.toUpperCase()}`;

  // Take focus only from the board itself (the console that just hid, the skip key) or from nowhere —
  // never from a visitor who has tabbed on to another part of the page.
  useEffect(() => {
    const a = document.activeElement;
    if (!a || a === document.body || heading.current?.closest("[data-cc-board]")?.contains(a)) heading.current?.focus({ preventScroll: true });
  }, []);

  useGSAP(
    () => {
      if (reduced) return;
      const q = gsap.utils.selector(sheet);
      gsap
        .timeline()
        // both ends explicit: a tween to the computed "none" can't interpolate and would just pop
        .fromTo(sheet.current, { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.85, ease: "machine", clearProps: "clipPath" })
        // opacity, not autoAlpha: visibility:hidden would make the heading unfocusable on mount
        .from(q("[data-row]"), { opacity: 0, y: 14, duration: 0.6, stagger: 0.07, ease: "expo.out" }, 0.3)
        .from(q("[data-stamp]"), { opacity: 0, scale: 2.3, rotate: -24, duration: 0.5, ease: "snap", onStart: () => play("drop") }, "-=0.35");
    },
    { scope: sheet },
  );

  const copy = async () => {
    const text = [
      `DECISION BRIEF Nº ${number} — ${room.date} — ${room.client}`,
      `Matter: ${asked}${exact ? "" : ` (read as: ${scenario.prompt})`}`,
      `Verdict: ${brief.verdict}`,
      `Recommendation: ${brief.recommendation}`,
      ...brief.facts.map((f) => `${f.label}: ${f.value}`),
      `Votes: ${agents.map((a) => `${a.role} ${STANCE_LABEL[scenario.takes[a.id].stance]} (${scenario.takes[a.id].confidence}%)`).join(", ")}`,
      `Dissent on record — ${dissenter?.role}: “${brief.dissent.quote}”`,
      `— ${title}, scripted demo session`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      emit("toast", { text: "Brief copied to clipboard" });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      emit("toast", { text: "Clipboard blocked — select the brief text instead" });
    }
  };

  const paper = {
    "--cc-fg": color.bg,
    "--fg": color.bg,
    "--bg": color.fg,
    "--line": "rgb(7 9 10 / 0.16)",
    "--line-strong": color.bg,
    "--fg-muted": "#3d4440",
    background: color.fg,
    color: color.bg,
  } as CSSProperties;

  return (
    <section ref={ref} aria-labelledby="cc-brief" className={cn("relative z-[2] flex flex-col", className)}>
      <div ref={sheet} style={paper} className="relative flex max-h-full flex-col overflow-hidden rounded-[4px] shadow-[0_40px_90px_-30px_rgb(0_0_0/0.95)]">
        <div aria-hidden className="cc-perf h-2 w-full shrink-0 bg-[position:4px_2px]" />
        <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
          <header data-row className="flex items-start justify-between gap-4 border-b border-(--cc-fg)/15 pb-3">
            <h3
              id="cc-brief"
              ref={heading}
              tabIndex={-1}
              className="font-display text-[2rem] font-[860] uppercase leading-[0.82] tracking-[-0.03em] outline-none [font-variation-settings:'wdth'_68]"
            >
              Decision brief
            </h3>
            <p className="text-right font-mono text-[0.6875rem] uppercase leading-relaxed tracking-[0.12em]">
              Nº {number}
              <br />
              {room.date} · {room.client}
            </p>
          </header>

          <div data-row className="mt-4">
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] opacity-60">Matter</p>
            <p className="mt-1 font-serif text-[1.65rem] italic leading-[1.02]">{asked}</p>
            {!exact && (
              <p className="mt-1 font-mono text-[0.6875rem] uppercase tracking-[0.12em] opacity-60">Read as “{scenario.prompt}”</p>
            )}
          </div>

          <div data-row className="mt-4 flex flex-col items-start gap-3 sm:flex-row">
            <span
              data-stamp
              className="shrink-0 -rotate-3 border-2 border-current bg-(--cc-accent) px-2.5 py-1.5 font-display text-[1rem] font-[860] uppercase leading-none [font-variation-settings:'wdth'_80]"
            >
              {brief.verdict}
            </span>
            <p className="text-[1.0625rem] font-[580] leading-snug tracking-[-0.005em]">{brief.recommendation}</p>
          </div>

          <dl data-row className="mt-5 grid grid-cols-2 border-t border-(--cc-fg)/15">
            {brief.facts.map((f, i) => (
              <div key={f.label} className={cn("border-b border-(--cc-fg)/15 py-2.5", i % 2 === 0 ? "border-r pr-3" : "pl-3")}>
                <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] opacity-60">{f.label}</dt>
                <dd className="mt-1 text-[0.9375rem] font-[560] leading-snug">{f.value}</dd>
              </div>
            ))}
          </dl>

          <div data-row className="mt-4">
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] opacity-60">
              Votes — {votes.for} for · {votes.conditional} conditional · {votes.against} against
            </p>
            <ul className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-1.5">
              {agents.map((a) => (
                <li key={a.id} className="flex items-center gap-2 rounded-[4px] border border-(--cc-fg)/15 px-2 py-1.5">
                  <span className="w-11 font-display text-[1rem] font-[800] leading-none [font-variation-settings:'wdth'_110]">{a.role}</span>
                  <StanceBadge stance={scenario.takes[a.id].stance} />
                  <span className="ml-auto font-mono text-[0.6875rem] tabular-nums opacity-70">{scenario.takes[a.id].confidence}%</span>
                </li>
              ))}
            </ul>
          </div>

          <figure data-row className="mt-5 border-l-2 border-[#ff5a1f] pl-4">
            <figcaption className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] opacity-60">
              Dissent on record — {dissenter?.role}
            </figcaption>
            <blockquote className="mt-1 font-serif text-[1.35rem] italic leading-[1.1]">“{brief.dissent.quote}”</blockquote>
          </figure>

          <div data-row className="mt-6 flex flex-wrap gap-2">
            <Button size="sm" variant="ink" onClick={copy} icon={copied ? <Check size={14} /> : <Copy size={14} />}>
              {copied ? "Copied" : "Copy brief"}
            </Button>
            <Button size="sm" variant="ghost" onClick={onReplay} icon={<RotateCcw size={14} />}>
              Replay session
            </Button>
            <Button size="sm" variant="ghost" onClick={onReset} icon={<Plus size={14} />}>
              Ask another
            </Button>
          </div>
        </div>
        {chaos && (
          <span
            aria-hidden
            className="pointer-events-none absolute right-5 top-20 rotate-[12deg] border-4 border-[#e5261b] px-3 py-1 font-display text-[2.2rem] font-[900] uppercase leading-none text-[#e5261b] opacity-80 mix-blend-multiply"
          >
            Contested
          </span>
        )}
      </div>
    </section>
  );
}
