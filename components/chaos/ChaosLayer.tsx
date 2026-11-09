"use client";
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { useChaos } from "@/lib/hooks";

// Chaos code ships in its own chunk, fetched the first time chaos turns on.
const ChaosEffects = dynamic(() => import("./ChaosEffects"), { ssr: false });

/** Mounted once in the root layout. Stays mounted through the exit so chaos can settle, not snap off. */
export default function ChaosLayer() {
  const chaos = useChaos();
  const [mounted, setMounted] = useState(false);
  if (chaos && !mounted) setMounted(true);
  const settled = useCallback(() => setMounted(false), []);
  return mounted ? <ChaosEffects active={chaos} onSettled={settled} /> : null;
}
