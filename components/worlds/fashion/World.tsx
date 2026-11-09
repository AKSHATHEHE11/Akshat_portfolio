"use client";
// STUB — replaced by the fashion world implementation.
import type { WorldProps } from "../types";
import type { FashionScene } from "./scene";
import { WorldPlaceholder } from "../WorldPlaceholder";

export default function FashionWorld({ project }: WorldProps<FashionScene>) {
  return <WorldPlaceholder project={project} />;
}
