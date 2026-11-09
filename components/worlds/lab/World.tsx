"use client";
// STUB — replaced by the lab world implementation.
import type { WorldProps } from "../types";
import type { LabScene } from "./scene";
import { WorldPlaceholder } from "../WorldPlaceholder";

export default function LabWorld({ project }: WorldProps<LabScene>) {
  return <WorldPlaceholder project={project} />;
}
