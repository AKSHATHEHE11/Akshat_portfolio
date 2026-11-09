import type { Project } from "@/lib/types";

/** Props every world receives. S is the world's own scene type (components/worlds/<type>/scene.ts). */
export interface WorldProps<S = unknown> {
  project: Project<S>;
}
