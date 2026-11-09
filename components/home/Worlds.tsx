"use client";
import { useEffect } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import type { ProjectSummary } from "@/lib/types";
import { useCoarse, useMediaQuery, useReducedMotion, useSystemReady } from "@/lib/hooks";
import { Carousel } from "./worlds/Carousel";
import { Footnote, Heading } from "./worlds/Heading";
import { Portal } from "./worlds/Portal";
import { Track } from "./worlds/Track";

/**
 * SELECTED WORLDS. Desktop: pinned horizontal track of portals on a railway index.
 * Touch / narrow: swipeable portals. Reduced motion: a plain list.
 * Exactly one layout renders at a time, so each morph name exists once on the page.
 */
export default function Worlds({ projects }: { projects: ProjectSummary[] }) {
  const ready = useSystemReady();
  const reduced = useReducedMotion();
  const coarse = useCoarse();
  const narrow = useMediaQuery("(max-width: 767px)");
  const mode = !ready ? "track" : reduced ? "list" : coarse || narrow ? "swipe" : "track";

  // Leaving the track takes its pin spacer (thousands of px) out of the page, and killing a pin
  // doesn't refresh the others: every trigger below would fire that far too late.
  useEffect(() => {
    if (mode !== "track") ScrollTrigger.refresh();
  }, [mode]);

  if (mode === "track") return <Track projects={projects} />;

  return (
    <section id="worlds" data-rail="Worlds" className="relative border-t border-line pt-[calc(var(--nav-h)+2rem)] pb-[clamp(4rem,10vw,8rem)]">
      <div className="frame">
        <Heading className="text-display-l" />
      </div>
      {mode === "swipe" ? (
        <Carousel projects={projects} />
      ) : (
        <div className="frame mt-12 grid gap-x-(--gutter) gap-y-14 md:grid-cols-2">
          {projects.map((p, i) => (
            <Portal key={p.slug} p={p} index={i} total={projects.length} running={false} variant="list" />
          ))}
        </div>
      )}
      <div className="frame mt-14">
        <Footnote />
      </div>
    </section>
  );
}
