"use client";
import type { CSSProperties } from "react";
import { Binoculars, CircleQuestionMark, CodeXml, PenTool, Rocket, Wrench, Zap } from "lucide-react";
import type { PipelineStage } from "@/data/think";
import { play } from "@/lib/sound";
import { cn, seeded } from "@/lib/utils";
import "./think.css";

const ICON = {
  observe: Binoculars,
  question: CircleQuestionMark,
  design: PenTool,
  build: CodeXml,
  break: Zap,
  fix: Wrench,
  ship: Rocket,
} satisfies Record<PipelineStage["id"], unknown>;

export type ModuleState = "idle" | "passed" | "active";

interface Props {
  stage: PipelineStage;
  index: number;
  total: number;
  /** visual state: idle, signal has passed, or lit (scroll-active or inspected) */
  state: ModuleState;
  /** the step the signal is currently at (aria-current) */
  current: boolean;
  /** board only: the lamp cap that lights over the active module */
  lamp?: boolean;
  describedBy: string;
  onHover: (i: number | null) => void;
  onPick: (i: number) => void;
  className?: string;
  style?: CSSProperties;
}

/** One hardware module: metal housing, four screws, glass face with a line icon, engraved plate. */
export function Module({ stage, index, total, state, current, lamp = false, describedBy, onHover, onPick, className, style }: Props) {
  const Icon = ICON[stage.id];
  const vars = {
    "--fl-dur": `${(1.6 + seeded(index * 7 + 1) * 2.4).toFixed(2)}s`,
    "--fl-delay": `${(-seeded(index * 7 + 2) * 3).toFixed(2)}s`,
    ...style,
  } as CSSProperties;

  return (
    <button
      type="button"
      className={cn("brain-module", className)}
      style={vars}
      data-state={state}
      aria-label={`${stage.label}, step ${index + 1} of ${total}`}
      aria-describedby={describedBy}
      aria-current={current ? "step" : undefined}
      data-cursor="hover"
      data-cursor-label="ROUTE"
      // Inspect on real pointer movement, not on enter: the board is sticky, so a mouse resting
      // mid-screen while the wheel scrolls would otherwise pin one module as "active" for the whole scene.
      onPointerEnter={() => play("tick")}
      onPointerMove={() => onHover(index)}
      onPointerLeave={() => onHover(null)}
      // keyboard focus only: a tap also focuses the button, and must not leave the module stuck lit
      onFocus={(e) => e.currentTarget.matches(":focus-visible") && onHover(index)}
      onBlur={() => onHover(null)}
      onClick={() => onPick(index)}
    >
      {lamp && <span aria-hidden className="brain-lamp" />}
      <span aria-hidden className="brain-housing">
        {[0, 1, 2, 3].map((k) => (
          <span
            key={k}
            className="brain-screw"
            data-corner={k}
            style={{ "--r": `${Math.round(seeded(index * 4 + k + 40) * 180)}deg` } as CSSProperties}
          />
        ))}
        <span className="brain-face">
          <Icon className="brain-icon" strokeWidth={1.5} />
          <span className="brain-led" />
        </span>
        <span className="brain-plate">
          <span className="brain-plateText">{stage.label}</span>
        </span>
      </span>
    </button>
  );
}
