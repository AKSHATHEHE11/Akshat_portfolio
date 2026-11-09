import { Morph } from "@/components/transitions/Morph";
import { morph } from "@/lib/transitions";
import type { Project } from "@/lib/types";

/** Temporary world used until a world is implemented. Keeps the portal morph working. */
export function WorldPlaceholder({ project }: { project: Project }) {
  return (
    <section
      className="relative grid min-h-svh place-items-center overflow-hidden"
      style={{ color: project.color.fg }}
    >
      <Morph name={morph.stage(project.slug)}>
        <div className="absolute inset-0" style={{ background: project.color.bg }} />
      </Morph>
      <Morph name={morph.title(project.slug)} variant="text">
        <h1 className="display relative text-display-l">{project.title}</h1>
      </Morph>
    </section>
  );
}
