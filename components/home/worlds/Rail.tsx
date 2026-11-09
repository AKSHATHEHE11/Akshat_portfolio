"use client";
import type { Ref } from "react";
import { ArrowRight } from "lucide-react";
import { play } from "@/lib/sound";
import type { ProjectSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import "./worlds.css";

/** The little locomotive that rides the rail. */
export function Train({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 21" className={cn("h-[21px] w-12 text-fg", className)} aria-hidden>
      <path d="M28 4.5V1.5h4v3" fill="currentColor" />
      <path d="M2 15V8a3.5 3.5 0 0 1 3.5-3.5H27l6 4h8.5A4.5 4.5 0 0 1 46 13v2Z" fill="currentColor" />
      <rect x="7" y="7.5" width="6" height="4" rx="1" fill="#d8ff00" />
      <rect x="16" y="7.5" width="6" height="4" rx="1" fill="#d8ff00" />
      <circle cx="43.6" cy="12" r="1.4" fill="#ff5a1f" />
      {[10, 20, 37].map((x) => (
        <circle key={x} cx={x} cy="16.5" r="3.2" fill="currentColor" stroke="var(--bg)" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

/**
 * Index + progress for the pinned track, drawn as a railway line: one station per world, the train
 * is the progress marker. Stations are buttons (jump to that world).
 */
export function Rail({
  projects,
  stops,
  active,
  next,
  onStop,
  onNext,
  lineRef,
  trainRef,
  fillRef,
}: {
  projects: ProjectSummary[];
  stops: number[];
  active: number;
  next: string | null;
  onStop: (i: number) => void;
  onNext: () => void;
  lineRef: Ref<HTMLDivElement>;
  trainRef: Ref<HTMLSpanElement>;
  fillRef: Ref<HTMLSpanElement>;
}) {
  return (
    <nav aria-label="Worlds" className="wd-rail">
      <span className="label hidden shrink-0 items-center gap-2 text-fg-muted xl:flex">
        Scroll the rail <ArrowRight size={12} strokeWidth={1.75} />
      </span>
      <div ref={lineRef} className="wd-line">
        <span aria-hidden ref={fillRef} className="wd-fill" />
        {projects.map((p, i) => (
          <button
            key={p.slug}
            type="button"
            className="wd-stop"
            style={{ left: `${(stops[i] ?? 0) * 100}%` }}
            data-active={i === active || undefined}
            aria-current={i === active ? "true" : undefined}
            aria-label={`Go to ${p.title}`}
            onPointerEnter={() => play("tick")}
            onClick={() => onStop(i)}
            data-cursor="hover"
          >
            <span aria-hidden className="wd-dot" />
            <span className="wd-chip">{p.id}</span>
            <span className="label wd-stop-name hidden lg:block">{p.title}</span>
          </button>
        ))}
        <span ref={trainRef} className="wd-train">
          <Train />
        </span>
      </div>
      {next && (
        <button
          type="button"
          onClick={onNext}
          className="label flex shrink-0 items-center gap-2 text-fg-muted transition-colors hover:text-fg"
          data-cursor="hover"
          data-chaos-escape
        >
          Next stop <ArrowRight size={12} strokeWidth={1.75} /> <span className="text-fg">{next}</span>
        </button>
      )}
    </nav>
  );
}
