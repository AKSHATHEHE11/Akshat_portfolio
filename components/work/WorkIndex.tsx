"use client";
// STUB — replaced by the Work Index implementation (grid / list / chaos / timeline / system modes).
import type { ProjectSummary } from "@/lib/types";

export default function WorkIndex({ projects }: { projects: ProjectSummary[] }) {
  return (
    <section className="frame grid min-h-svh place-items-center">
      <p className="label text-fg-muted">Work index ({projects.length}) — coming online</p>
    </section>
  );
}
