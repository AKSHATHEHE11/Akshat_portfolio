"use client";
import { memo, type CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import { Morph } from "@/components/transitions/Morph";
import { TLink } from "@/components/ui/TLink";
import { play } from "@/lib/sound";
import { morph } from "@/lib/transitions";
import type { ProjectSummary } from "@/lib/types";
import { Motif } from "./Motif";
import type { Mode } from "./modes";
import "./work.css";

export interface Entry {
  p: ProjectSummary;
  tags: string[];
  /** ls -la columns, derived from real data (status → permissions, record size → size) */
  perm: string;
  size: string;
  /** lower-case text grep runs against */
  hay: string;
  /** per-item CSS vars: project colours, chaos scatter, timeline slot, tilt, intro order */
  vars: CSSProperties;
  side: 0 | 1;
}

/**
 * One project, rendered ONCE. Every mode re-lays out these same nodes with CSS; atoms marked
 * data-flip (plate, index, title, category, colour chip) are what Flip flies between layouts,
 * and the chip/title carry the portal → world morph names, so each name exists once per page.
 * Memoised: hovering a row re-renders that row and the one it took over from, not the whole list.
 */
export const WorkItem = memo(function WorkItem({
  e,
  mode,
  active,
  hidden,
  onIntent,
  onFocusIn,
}: {
  e: Entry;
  mode: Mode;
  active: boolean;
  hidden: boolean;
  onIntent: (slug: string | null) => void;
  onFocusIn: (slug: string) => void;
}) {
  const { p } = e;
  const chaos = mode === "chaos";

  return (
    <li
      className="wk-item"
      style={e.vars}
      hidden={hidden}
      data-slug={p.slug}
      data-active={active || undefined}
      data-side={e.side}
      data-status={p.status}
      onPointerEnter={(ev) => ev.pointerType === "mouse" && onIntent(p.slug)}
      onPointerLeave={() => onIntent(null)}
      onFocus={() => onFocusIn(p.slug)}
    >
      <span className="wk-plate" data-flip aria-hidden />
      <TLink
        href={`/work/${p.slug}`}
        kind="world-enter"
        className="wk-link"
        aria-label={`${p.title}, ${p.category}, ${p.year}`}
        data-cursor={chaos ? "drag" : "open"}
        data-cursor-label={chaos ? "DRAG" : "ENTER"}
        draggable={chaos ? false : undefined}
        onPointerEnter={() => play("tick")}
      >
        <span className="wk-idx" data-flip data-grip>
          {p.id}
        </span>
        <span className="wk-perm" data-fade>
          {e.perm}
        </span>
        <span className="wk-size" data-fade>
          {e.size}
        </span>
        <span className="wk-year" data-fade>
          {p.year}
        </span>
        <Morph name={morph.title(p.slug)} variant="text">
          <span className="wk-title" data-flip data-grip>
            {p.title}
          </span>
        </Morph>
        <span className="wk-cat" data-flip>
          {p.category}
        </span>
        <span className="wk-tags" data-fade>
          {e.tags.map((t) => (
            <span key={t} className="wk-tag">
              {t}
            </span>
          ))}
        </span>
        <span className="wk-status" data-fade>
          {p.status}
        </span>
        <Morph name={morph.stage(p.slug)}>
          <span className="wk-chip" data-flip data-chip>
            <Motif env={p.environment} color={p.color} />
          </span>
        </Morph>
        <span className="wk-more" data-more>
          <span className="wk-tagline">{p.tagline}</span>
          <span className="wk-enter">
            Enter world <ArrowUpRight size={15} strokeWidth={2} aria-hidden />
          </span>
        </span>
      </TLink>
    </li>
  );
});
