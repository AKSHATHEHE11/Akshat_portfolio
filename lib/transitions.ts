"use client";
// Page transitions run on React <ViewTransition> + the browser View Transitions API.
// A navigation carries a "kind" (transition type). Each page is wrapped in <Page> which maps
// kinds to CSS animation classes (components/transitions/transitions.css).
//
//   <TLink href="/work" kind="nav-forward">              (components/ui/TLink.tsx)
//   const go = useNavigate(); go("/work/fybr8", "world-enter", { x, y })
//
// Worlds morph from their portal: wrap the portal visual and the world's stage in
// <Morph name={morph.stage(slug)}> and the titles in <Morph name={morph.title(slug)}>.
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { play } from "./sound";
import { system } from "./system";

export type NavKind =
  | "nav-forward" // deeper into the site (default)
  | "nav-back" // back up a level
  | "world-enter" // portal → project world (pairs with <Morph>)
  | "world-exit" // world → work index / home
  | "world-next" // switch to the next world (rail wipe →)
  | "world-prev"; // switch to the previous world (rail wipe ←)

/** Transition types for a navigation: the kind, plus "chaos" while chaos mode is on. */
export function navTypes(kind: NavKind): string[] {
  return system.get().chaos ? [kind, "chaos"] : [kind];
}

/** Remember where the click happened so the reveal can grow from that point. */
export function setTransitionOrigin(x: number, y: number) {
  const s = document.documentElement.style;
  s.setProperty("--vt-x", `${Math.round(x)}px`);
  s.setProperty("--vt-y", `${Math.round(y)}px`);
  s.setProperty("--vt-doc-y", `${Math.round(y + window.scrollY)}px`);
}

/** Programmatic navigation with a transition kind (keyboard shortcuts, drag-to-open, etc). */
export function useNavigate() {
  const router = useRouter();
  return useCallback(
    (href: string, kind: NavKind = "nav-forward", origin?: { x: number; y: number }) => {
      setTransitionOrigin(origin?.x ?? window.innerWidth / 2, origin?.y ?? window.innerHeight / 2);
      play("whoosh");
      router.push(href, { transitionTypes: navTypes(kind) });
    },
    [router],
  );
}

/** Shared-element names for portal ↔ world morphs. Each name must exist at most once per page. */
export const morph = {
  stage: (slug: string) => `world-stage-${slug}`,
  title: (slug: string) => `world-title-${slug}`,
};
