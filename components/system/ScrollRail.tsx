"use client";
import { useCoarse, useSystemReady } from "@/lib/hooks";
import { Rail } from "./rail/Rail";

/**
 * Right-edge progress instrument (mockup 1). Fine pointers only. Inside a project world it hides
 * itself but stays mounted: removing a named element mid view-transition skips the whole transition.
 */
export default function ScrollRail() {
  const ready = useSystemReady();
  const coarse = useCoarse();
  return ready && !coarse ? <Rail /> : null;
}
