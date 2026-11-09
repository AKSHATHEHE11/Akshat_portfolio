"use client";
import { useEffect, useState } from "react";
import { pad } from "@/lib/utils";

export interface WorldInfo {
  slug: string;
  /** display index, "02" */
  index: string;
  /** "06" */
  total: string;
  title: string;
}

/**
 * Index + title of the open world (nav readout, HUD, menu panel). Project data is imported lazily,
 * only once a world opens, so the global chrome doesn't ship every project's scene to every page.
 */
export function useWorldInfo(slug: string | null): WorldInfo | null {
  const [info, setInfo] = useState<WorldInfo | null>(null);

  useEffect(() => {
    if (!slug) return;
    let live = true;
    import("@/data/projects").then(({ summaries }) => {
      const p = summaries.find((s) => s.slug === slug);
      if (live && p) setInfo({ slug, index: p.id, total: pad(summaries.length), title: p.title });
    });
    return () => {
      live = false;
    };
  }, [slug]);

  return info && info.slug === slug ? info : null;
}
