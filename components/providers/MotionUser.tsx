"use client";
import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";

/**
 * motion follows the visitor's reduced-motion setting inside this. The site no longer wraps every page
 * in it (Providers), so motion's code stays out of pages that don't use it: wrap the root of each
 * motion subtree instead (the About desk panel, the Playground legend, the worlds that use motion).
 */
export function MotionUser({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
