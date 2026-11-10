"use client";
// Null Field — a shader instrument. One live field (R3F + a custom shader: domain-warped fbm, cosine
// palette, feedback trails, ordered dither, grain) sits behind the hero, the instrument (#preview),
// the story and the patch notes (#process); then the patch bay (decisions), the signal flow (tech —
// the same canvas moves there and draws every stage) and the VU meters (outcome).
import { useEffect, useState, type CSSProperties } from "react";
import "./lab.css";
import type { WorldProps } from "../types";
import { createField } from "./field";
import { FieldProvider } from "./FieldHost";
import { Flow } from "./Flow";
import { Meters } from "./Meters";
import { Notes } from "./Notes";
import { Panel } from "./Panel";
import { PatchBay } from "./PatchBay";
import type { LabScene } from "./scene";
import { Stage } from "./Stage";
import { Story } from "./Story";

export default function LabWorld({ project }: WorldProps<LabScene>) {
  const { color, scene } = project;
  const [field] = useState(() => createField(scene));
  useEffect(() => () => field.dispose(), [field]);

  // always dark: the site's semantic tokens point at the world's palette inside it, so shared marks
  // (Led, focus, selection) speak Null Field whatever the site theme is
  const palette = {
    "--bg": color.bg,
    "--fg": color.fg,
    "--fg-muted": `color-mix(in oklab, ${color.fg} 64%, ${color.bg})`,
    "--line": `color-mix(in oklab, ${color.fg} 14%, transparent)`,
    "--line-strong": color.fg,
    "--surface": `color-mix(in oklab, ${color.fg} 5%, ${color.bg})`,
    "--surface-2": `color-mix(in oklab, ${color.fg} 9%, ${color.bg})`,
    "--accent": color.accent,
    "--accent-ink": color.bg,
    background: color.bg,
    color: color.fg,
    colorScheme: "dark",
  } as CSSProperties;

  return (
    <FieldProvider field={field} accent={color.accent}>
      <div className="nf-world relative overflow-x-clip pb-28" style={palette}>
        <Stage project={project}>
          <section id="preview" aria-labelledby="nf-play-h" className="frame flex min-h-svh scroll-mt-0 flex-col justify-end pb-32 pt-28 md:pb-36">
            <h2 id="nf-play-h" className="sr-only">
              The instrument: every control is a shader uniform
            </h2>
            <Panel model={scene.model} serial={scene.serial} />
          </section>
          <Story project={project} />
          <Notes steps={project.process} notes={scene.patchNotes} />
        </Stage>
        <PatchBay decisions={project.decisions} />
        <Flow flow={scene.flow} tech={project.technologies} />
        <Meters metrics={project.metrics} scales={scene.meters} />
      </div>
    </FieldProvider>
  );
}
