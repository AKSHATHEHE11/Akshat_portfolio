"use client";
// STUB — replaced by the railway world implementation.
import type { WorldProps } from "../types";
import type { RailwayScene } from "./scene";
import { WorldPlaceholder } from "../WorldPlaceholder";

export default function RailwayWorld({ project }: WorldProps<RailwayScene>) {
  return <WorldPlaceholder project={project} />;
}
