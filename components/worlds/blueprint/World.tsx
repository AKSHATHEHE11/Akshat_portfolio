"use client";
// STUB — replaced by the blueprint world implementation.
import type { WorldProps } from "../types";
import type { BlueprintScene } from "./scene";
import { WorldPlaceholder } from "../WorldPlaceholder";

export default function BlueprintWorld({ project }: WorldProps<BlueprintScene>) {
  return <WorldPlaceholder project={project} />;
}
