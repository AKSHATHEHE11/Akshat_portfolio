"use client";
// Synthora SID — a student information system drawn as an architectural set on blueprint paper.
// A-001 site plan (identity) → A-002 general notes (story) → A-101 the working student app (#preview)
// → A-201 revisions (#process) → A-301 details (decisions) → A-401 section (technology)
// → A-501 dimensions (outcome). Lines draft themselves as each sheet arrives.
import "./blueprint.css";
import "./sheets.css";
import type { CSSProperties } from "react";
import type { WorldProps } from "../types";
import { worldTokens } from "../shell/palette";
import { Cover } from "./Cover";
import { Details } from "./Details";
import { Dimensions } from "./Dimensions";
import { Hatches } from "./kit";
import { Preview } from "./Preview";
import { Revisions } from "./Revisions";
import type { BlueprintScene } from "./scene";
import { Section } from "./Section";
import { Story } from "./Story";

/** Sheets in the set (A-001 … A-501), for the title block. */
const SHEETS = 7;

export default function BlueprintWorld({ project }: WorldProps<BlueprintScene>) {
  const { bg, fg, accent } = project.color;
  // the drawing is always blue: shared UI (Button, focus) reads the world's palette, not the theme
  const palette = {
    ...worldTokens(project.color),
    "--bp-bg": bg,
    "--bp-fg": fg,
    "--bp-acc": accent,
    backgroundColor: bg,
    colorScheme: "dark",
  } as CSSProperties;

  return (
    <div className="bp bp-paper relative overflow-x-clip pb-28" style={palette}>
      {/* hatch patterns, referenced by id from every sheet */}
      <svg aria-hidden width="0" height="0" className="absolute" style={{ color: fg }}>
        <Hatches />
      </svg>
      <Cover project={project} sheets={SHEETS} />
      <Story project={project} />
      <Preview project={project} />
      <Revisions project={project} />
      <Details project={project} />
      <Section technologies={project.technologies} />
      <Dimensions metrics={project.metrics} />
    </div>
  );
}
