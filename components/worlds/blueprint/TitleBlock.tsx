// The drawing's title block, bottom-right of sheet A-001. In chaos the drawing is stamped VOID.
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import { revLetter } from "./kit";
import type { BlueprintScene } from "./scene";

export function TitleBlock({ project, sheets, className }: { project: Project<BlueprintScene>; sheets: number; className?: string }) {
  const { scene, title, year, role, category, status, process } = project;
  const rev = revLetter(Math.max(0, process.length - 1));
  return (
    <div className={cn("bp-tb", className)} data-bi>
      <dl className="bp-tb-grid">
        <div className="bp-tb-wide">
          <dt>Project</dt>
          <dd className="bp-tb-big">{title}</dd>
        </div>
        <div>
          <dt>Sheet</dt>
          <dd className="bp-tb-big">
            {scene.sheet.number}
            <small> / {String(sheets).padStart(2, "0")}</small>
          </dd>
        </div>
        <div>
          <dt>Rev</dt>
          <dd className="bp-tb-big">{rev}</dd>
        </div>
        <div className="bp-tb-wide">
          <dt>Client</dt>
          <dd>{scene.sheet.client}</dd>
        </div>
        <div>
          <dt>Drawn by</dt>
          <dd>{scene.sheet.drawnBy}</dd>
        </div>
        <div>
          <dt>Scale</dt>
          <dd>{scene.sheet.scale}</dd>
        </div>
        <div className="bp-tb-wide">
          <dt>Disciplines</dt>
          <dd>{role.join(" · ")}</dd>
        </div>
        <div>
          <dt>Drawing</dt>
          <dd>{category}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{year}</dd>
        </div>
      </dl>
      <span className="bp-stamp" data-chaos-drift>
        <span className="sr-only">Status: </span>
        {status}
      </span>
      <span className="bp-void chaos-only" aria-hidden>
        Void
      </span>
    </div>
  );
}
