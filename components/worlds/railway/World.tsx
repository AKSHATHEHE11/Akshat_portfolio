"use client";
import "./railway.css";
import type { CSSProperties } from "react";
import ShowcaseWorld from "../showcase/World";
import type { WorldProps } from "../types";
import Journey from "./Journey";
import type { RailwayScene } from "./scene";

/**
 * Safar Zaika: the showcase page (its own fonts and colours, the real site, a link out), then the
 * ride — a coach on the Delhi–Varanasi line, where scrolling runs the train down the route and the
 * meal is handed over at each halt.
 */
export default function RailwayWorld({ project }: WorldProps<RailwayScene>) {
  const { color } = project;
  const vars = { "--rw-navy": color.bg, "--rw-cream": color.fg, "--rw-mustard": color.accent } as CSSProperties;
  return (
    <ShowcaseWorld project={project}>
      <div className="rw" style={vars}>
        <Journey project={project} />
      </div>
    </ShowcaseWorld>
  );
}
