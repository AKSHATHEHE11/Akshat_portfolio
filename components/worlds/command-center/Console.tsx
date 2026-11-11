"use client";
// The table console: type a question or pick a matter on file → the board convenes.
// In session it becomes the chair's desk: the matter, who has spoken, and a skip key.
import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from "react";
import { ArrowRight, FastForward } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";
import type { AgentStatus } from "./engine";
import type { BoardAgent, Scenario } from "./scene";

interface Props {
  scenarios: Scenario[];
  agents: BoardAgent[];
  statuses: AgentStatus[];
  phase: "idle" | "session" | "brief";
  asked: string | null;
  matched: Scenario | null;
  exact: boolean;
  announce: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onConvene: (text: string, index?: number) => void;
  onSkip: () => void;
  className?: string;
}

export function Console({ scenarios, agents, statuses, phase, asked, matched, exact, announce, inputRef, onConvene, onSkip, className }: Props) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const desk = useRef<HTMLDivElement>(null);
  const hadFocus = useRef(false);
  const [text, setText] = useState("");
  const [hint, setHint] = useState(false);

  const convene = (value: string, index?: number) => {
    hadFocus.current = !!box.current?.contains(document.activeElement);
    setHint(false);
    onConvene(value, index);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setHint(true);
      play("error");
      inputRef.current?.focus();
      return;
    }
    convene(text);
    setText("");
  };

  // keyboard users keep their place: focus follows the console into its session view — also after
  // "Replay session", whose button unmounts with the brief and drops focus to <body>
  useEffect(() => {
    if (phase !== "session") return;
    const a = document.activeElement;
    if (hadFocus.current || !a || a === document.body) desk.current?.focus({ preventScroll: true });
  }, [phase]);

  return (
    <div
      ref={box}
      className={cn(
        "relative rounded-[12px] border border-(--cc-fg)/14 bg-[linear-gradient(180deg,rgb(233_240_234/0.06),rgb(233_240_234/0.015))] p-4 shadow-[inset_0_1px_0_rgb(233_240_234/0.08),0_30px_60px_-30px_rgb(0_0_0/0.9)] backdrop-blur-[2px] md:p-5",
        className,
      )}
    >
      {phase === "idle" ? (
        <form onSubmit={submit} noValidate>
          <div className="flex items-center justify-between gap-3 font-mono text-[0.6875rem] uppercase tracking-[0.14em]">
            <label htmlFor={id} className="text-(--cc-accent)">
              › Ask the board
            </label>
            <span className="hidden text-(--cc-fg)/60 sm:inline">Scripted session · {scenarios.length} matters on file</span>
          </div>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              id={id}
              ref={inputRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setHint(false);
              }}
              // typing here must not fire the site's single-key shortcuts or world switching
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Escape") e.currentTarget.blur();
              }}
              placeholder="Should we…"
              autoComplete="off"
              spellCheck={false}
              maxLength={140}
              aria-describedby={`${id}-hint`}
              data-cursor="text"
              className="h-12 min-h-12 min-w-0 flex-1 border-b border-(--cc-accent)/35 bg-transparent font-display text-[1.3rem] font-[500] tracking-[-0.01em] text-(--cc-fg) transition-colors placeholder:text-(--cc-fg)/45 focus:border-(--cc-accent)"
            />
            <Button type="submit" variant="accent" icon={<ArrowRight size={18} strokeWidth={1.75} />} className="self-start sm:self-auto">
              Convene
            </Button>
          </div>
          <p id={`${id}-hint`} className={cn("mt-2 text-[0.8125rem]", hint ? "text-[#ff8a5c]" : "sr-only")}>
            Type a yes/no question, or pick a matter on file. Free text goes to the closest one.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--cc-fg)/60">On file</span>
            {scenarios.map((s, i) => (
              <button
                key={s.id}
                type="button"
                data-chaos-escape
                data-cursor="hover"
                onPointerEnter={() => play("tick")}
                onClick={() => {
                  play("press");
                  convene(s.prompt, i);
                }}
                className="h-8 rounded-full border coarse:h-11 border-(--cc-fg)/20 px-3 font-mono text-[0.75rem] text-(--cc-fg)/85 transition-colors duration-200 hover:border-(--cc-accent) hover:bg-(--cc-accent) hover:text-[#07090a]"
              >
                {s.prompt}
              </button>
            ))}
          </div>
        </form>
      ) : (
        <div ref={desk} tabIndex={-1} className="outline-none">
          <div className="flex items-center justify-between gap-3 font-mono text-[0.6875rem] uppercase tracking-[0.14em]">
            <span className="text-(--cc-accent)">› Matter on the table</span>
            <span className="text-(--cc-fg)/60">{statuses.filter((s) => s === "done").length}/{agents.length} filed</span>
          </div>
          <p className="mt-2 font-display text-[1.4rem] font-[600] leading-[1.1] tracking-[-0.015em]">{asked}</p>
          {!exact && matched && (
            <p className="mt-1 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-(--cc-fg)/60">Read as: {matched.prompt}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <ol className="flex gap-1.5" aria-label="Seats">
              {agents.map((a, i) => (
                <li
                  key={a.id}
                  className={cn(
                    "flex h-7 items-center rounded-full border px-2.5 font-mono text-[0.6875rem] tracking-[0.08em] transition-colors duration-300",
                    statuses[i] === "speaking" || statuses[i] === "thinking"
                      ? "border-(--cc-accent) bg-(--cc-accent) text-[#07090a]"
                      : statuses[i] === "done"
                        ? "border-(--cc-fg)/40 text-(--cc-fg)"
                        : "border-(--cc-fg)/15 text-(--cc-fg)/55",
                  )}
                >
                  {a.role}
                </li>
              ))}
            </ol>
            <Button variant="ghost" size="sm" onClick={onSkip} disabled={phase === "brief"} icon={<FastForward size={14} strokeWidth={1.75} />}>
              Skip to brief
            </Button>
          </div>
        </div>
      )}
      <p aria-live="polite" className="mt-4 border-t border-(--cc-fg)/10 pt-3 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-(--cc-fg)/55">
        {announce}
      </p>
    </div>
  );
}
