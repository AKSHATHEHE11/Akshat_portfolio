"use client";
import { useEffect, useRef } from "react";
import { useIsomorphicLayoutEffect } from "@/lib/hooks";
import { system } from "@/lib/system";
import type { ProjectSummary } from "@/lib/types";
import { ControlBar } from "./ControlBar";
import { Finale } from "./Finale";

/**
 * The persistent frame around every project world: tells the system which world is open,
 * exposes its palette as --world-bg/--world-fg/--world-accent on <html> (nav + cursor read them),
 * renders the world, then the next-world finale, then the fixed console strip.
 */
export default function WorldShell({
  current,
  all,
  children,
}: {
  current: ProjectSummary;
  all: ProjectSummary[];
  children: React.ReactNode;
}) {
  const content = useRef<HTMLDivElement>(null);
  const n = all.length;
  const index = Math.max(0, all.findIndex((p) => p.slug === current.slug));
  const prev = all[(index - 1 + n) % n] ?? current;
  const next = all[(index + 1) % n] ?? current;
  const { bg, fg, accent } = current.color;

  useEffect(() => {
    system.setWorld(current.slug);
    return () => system.setWorld(null);
  }, [current.slug]);

  // Before paint, so the nav never shows a frame of the wrong palette.
  useIsomorphicLayoutEffect(() => {
    const st = document.documentElement.style;
    st.setProperty("--world-bg", bg);
    st.setProperty("--world-fg", fg);
    st.setProperty("--world-accent", accent);
    return () => {
      st.removeProperty("--world-bg");
      st.removeProperty("--world-fg");
      st.removeProperty("--world-accent");
    };
  }, [bg, fg, accent]);

  return (
    <>
      <div ref={content}>{children}</div>
      {n > 1 && next.slug !== current.slug && (
        <Finale current={current} next={next} nextIndex={(index + 1) % n} total={n} />
      )}
      <ControlBar current={current} all={all} index={index} prev={prev} next={next} content={content} />
    </>
  );
}
