"use client";
// STUB — replaced by the Selected Worlds implementation.
import type { ProjectSummary } from "@/lib/types";

export default function Worlds({ projects }: { projects: ProjectSummary[] }) {
  return (
    <section className="frame grid min-h-[60svh] place-items-center border-t border-line">
      <p className="label text-fg-muted">Selected worlds ({projects.length}) — coming online</p>
    </section>
  );
}
