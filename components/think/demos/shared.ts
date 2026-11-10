"use client";
import { useEffect, useRef } from "react";
import { useIsomorphicLayoutEffect } from "@/lib/hooks";

/** Every demo is the same mini UI with its rule off (the problem) or on (the rule applied). */
export interface DemoProps {
  on: boolean;
  /** the one big moment on the board — Calm uses it to shake the whole channel */
  onSurprise?: () => void;
}

/** Runs `fn` `delay` ms after `on` goes false → true: the lever was just thrown, so demonstrate. */
export function useThrownOn(on: boolean, fn: () => void, delay = 480) {
  const was = useRef(on);
  const latest = useRef(fn);
  useIsomorphicLayoutEffect(() => {
    latest.current = fn;
  });
  useEffect(() => {
    const thrown = on && !was.current;
    was.current = on;
    if (!thrown) return;
    const id = window.setTimeout(() => latest.current(), delay);
    return () => window.clearTimeout(id);
  }, [on, delay]);
}

/** Mini-UI type inside the demo screens (always ink on paper, whatever the page theme). */
export const micro = "font-mono text-[0.6875rem] uppercase leading-none tracking-[0.12em]";
