"use client";
import "./railway.css";
import "./sections.css";
import type { CSSProperties } from "react";
import type { WorldProps } from "../types";
import Arrivals from "./Arrivals";
import Chart from "./Chart";
import Consist from "./Consist";
import Journey from "./Journey";
import Junction from "./Junction";
import Preview from "./Preview";
import { readPnr } from "./rail";
import type { RailwayScene } from "./scene";

/**
 * Safar Zaika — a coach on the Delhi–Varanasi line. Scroll is the journey (identity + story),
 * then the order window with the working app, the reservation chart (process), departure boards
 * (decisions), the rake (technology) and the arrivals board (outcome).
 */
export default function RailwayWorld({ project }: WorldProps<RailwayScene>) {
  const { color, scene } = project;
  const vars = { "--rw-navy": color.bg, "--rw-cream": color.fg, "--rw-mustard": color.accent } as CSSProperties;
  return (
    <div className="rw pb-28" style={vars}>
      <Journey project={project} />
      <Preview project={project} />
      <Chart process={project.process} train={scene.train} year={project.year} coach={readPnr(scene.pnr, scene.train.consist).coach} />
      <Junction decisions={project.decisions} />
      <Consist technologies={project.technologies} train={scene.train} />
      <Arrivals metrics={project.metrics} route={scene.route} />
    </div>
  );
}
