"use client";
// For the two R3F specimens. Reduced motion runs their canvas with frameloop="demand": nothing moves on
// its own, and any pointer or key input on the specimen asks for frames (the scene keeps asking while
// its own physics settle). Lives outside shared.ts so the 2D specimens never pull in R3F.
import { useEffect, type RefObject } from "react";
import { useThree } from "@react-three/fiber";

const INPUT = ["pointermove", "pointerdown", "keydown"] as const;

export function useWake(host: RefObject<HTMLElement | null>) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const wake = () => invalidate();
    INPUT.forEach((e) => el.addEventListener(e, wake, { passive: true }));
    return () => INPUT.forEach((e) => el.removeEventListener(e, wake));
  }, [host, invalidate]);
}
