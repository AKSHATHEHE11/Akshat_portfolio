"use client";
// DecisionOS — the AI command center. A dark boardroom: four agent screens on the walls, a hologram
// globe in the middle, a console on the table. Ask the board, watch it argue, read the brief.
// Then the minutes, the mission log, the overrides, the systems and the readout of the same room.
import "./cc.css";
import { useEffect, useRef, type CSSProperties } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import type { WorldProps } from "../types";
import { MissionLog } from "./MissionLog";
import { Minutes } from "./Minutes";
import { Overrides } from "./Overrides";
import { Readout } from "./Readout";
import { Room } from "./Room";
import type { CommandCenterScene } from "./scene";
import { Systems } from "./Systems";

export default function CommandCenterWorld({ project }: WorldProps<CommandCenterScene>) {
  const { bg, fg, accent } = project.color;
  const root = useRef<HTMLDivElement>(null);

  // The room changes height after load (the brief prints into the flow on phones, the systems diagram
  // switches layout after hydration). Re-measure every scroll trigger below it, or they fire early/late.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let h = el.offsetHeight;
    let id = 0;
    const ro = new ResizeObserver(() => {
      if (el.offsetHeight === h) return;
      h = el.offsetHeight;
      window.clearTimeout(id);
      id = window.setTimeout(() => ScrollTrigger.refresh(), 180);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      window.clearTimeout(id);
    };
  }, []);
  // This world is always dark. Shared components (Button, Led, Kbd…) read the semantic tokens, so point
  // those at the world's palette here instead of the site theme.
  const palette = {
    "--cc-bg": bg,
    "--cc-fg": fg,
    "--cc-accent": accent,
    "--bg": bg,
    "--fg": fg,
    "--fg-muted": `color-mix(in oklab, ${fg} 62%, ${bg})`,
    "--line": `color-mix(in oklab, ${fg} 14%, transparent)`,
    "--line-strong": fg,
    "--surface": `color-mix(in oklab, ${fg} 5%, ${bg})`,
    "--surface-2": `color-mix(in oklab, ${fg} 9%, ${bg})`,
    "--accent": accent,
    "--accent-ink": bg,
    background: bg,
    color: fg,
    colorScheme: "dark",
  } as CSSProperties;

  return (
    <div ref={root} className="relative pb-28" style={palette}>
      <Room project={project} />
      <Minutes project={project} />
      <MissionLog project={project} />
      <Overrides decisions={project.decisions} />
      <Systems technologies={project.technologies} wiring={project.scene.wiring} />
      <Readout metrics={project.metrics} />
    </div>
  );
}
