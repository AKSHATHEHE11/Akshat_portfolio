"use client";
import { useState, type CSSProperties, type FocusEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import { Morph } from "@/components/transitions/Morph";
import { Corners, Led } from "@/components/ui/marks";
import { TLink } from "@/components/ui/TLink";
import { play } from "@/lib/sound";
import { morph } from "@/lib/transitions";
import type { ProjectSummary } from "@/lib/types";
import { seeded } from "@/lib/utils";
import { PREVIEWS } from "./previews";
import "./worlds.css";

const STATUS: Record<ProjectSummary["status"], { tone: "go" | "signal" | "accent" | "fg"; pulse: boolean }> = {
  live: { tone: "go", pulse: true },
  shipped: { tone: "fg", pulse: false },
  prototype: { tone: "signal", pulse: true },
  "in progress": { tone: "accent", pulse: true },
};

/**
 * A world, seen through a monitor. The screen is the morph source for the world's stage and the
 * title morphs into the world's title (world-enter transition).
 */
export function Portal({
  p,
  index,
  total,
  running,
  variant,
  onKeyboardFocus,
}: {
  p: ProjectSummary;
  index: number;
  total: number;
  running: boolean;
  variant: "track" | "swipe" | "list";
  /** keyboard focus landed here (the track scrolls it into view) */
  onKeyboardFocus?: () => void;
}) {
  const [hot, setHot] = useState(false);
  const Preview = PREVIEWS[p.environment];
  const status = STATUS[p.status];

  const focus = (e: FocusEvent<HTMLAnchorElement>) => {
    setHot(true);
    if (e.currentTarget.matches(":focus-visible")) onKeyboardFocus?.();
  };

  return (
    <TLink
      href={`/work/${p.slug}`}
      kind="world-enter"
      draggable={false}
      data-portal
      data-variant={variant}
      // drives every hover/focus style (worlds.css): one source of truth, and no sticky :hover after a tap
      data-hot={hot || undefined}
      data-cursor="open"
      data-cursor-label="ENTER"
      aria-label={`Enter ${p.title}: ${p.category}, ${p.year}. World ${index + 1} of ${total}.`}
      className="wd-portal"
      style={{ "--tilt": `${((seeded(index + 7) - 0.5) * 6).toFixed(2)}deg`, "--jit": `${(-index * 0.37).toFixed(2)}s` } as CSSProperties}
      onPointerEnter={() => {
        setHot(true);
        play("tick");
      }}
      onPointerLeave={() => setHot(false)}
      onFocus={focus}
      onBlur={() => setHot(false)}
    >
      <div className="wd-bezel">
        <Morph name={morph.stage(p.slug)}>
          <div
            className="wd-screen"
            style={{ "--p-bg": p.color.bg, "--p-fg": p.color.fg, "--p-accent": p.color.accent, background: p.color.bg, color: p.color.fg } as CSSProperties}
          >
            <div aria-hidden className="wd-preview">
              <Preview p={p} hot={hot} running={running} />
            </div>
            <span aria-hidden className="wd-scan" />
            <Corners className="wd-corners" size={16} inset={14} />
            <span aria-hidden className="label wd-env">[ {p.environment.replace("-", " ")} ]</span>
          </div>
        </Morph>
        <div aria-hidden className="wd-chin">
          <span className="label flex items-center gap-2">
            <Led tone="signal" pulse={hot} />
            CH {p.id}
          </span>
          <span className="wd-grille" />
        </div>
      </div>

      <div className="wd-info">
        <div className="flex items-baseline justify-between gap-4">
          <span className="label">[{p.id}]</span>
          <span className="label truncate text-fg-muted">{p.category}</span>
        </div>
        <div className="flex items-end justify-between gap-4">
          <div className="wd-title-wrap">
            <span aria-hidden className="wd-marker" />
            <Morph name={morph.title(p.slug)} variant="text">
              <h3 data-chaos-type className="wd-title">
                {p.title}
              </h3>
            </Morph>
          </div>
          <span aria-hidden className="wd-go">
            <ArrowUpRight size={20} strokeWidth={1.75} />
          </span>
        </div>
        <div className="flex items-start justify-between gap-6">
          <p className="max-w-[36ch] text-label text-fg-muted">{p.tagline}</p>
          <span className="label flex shrink-0 items-center gap-2 pt-0.5">
            <Led tone={status.tone} pulse={status.pulse} />
            {p.status} · {p.year}
          </span>
        </div>
      </div>
    </TLink>
  );
}
