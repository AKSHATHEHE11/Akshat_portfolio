"use client";
// STUB — replaced by the command-center world implementation.
import type { WorldProps } from "../types";
import type { CommandCenterScene } from "./scene";
import { WorldPlaceholder } from "../WorldPlaceholder";

export default function CommandCenterWorld({ project }: WorldProps<CommandCenterScene>) {
  return <WorldPlaceholder project={project} />;
}
