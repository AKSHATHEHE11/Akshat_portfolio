"use client";
// Each specimen is its own chunk, fetched when its station comes near the viewport.
// WebGL pieces (particle-field, ascii-room) split once more: their three.js part loads only when switched on.
// (next/dynamic wants its options as an inline object literal.)
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { Experiment } from "@/data/experiments";
import type { PieceProps } from "./shared";

function Loading() {
  return (
    <p className="xp-loading label" role="status">
      Loading specimen
    </p>
  );
}
export const PIECES: Record<Experiment["slug"], ComponentType<PieceProps>> = {
  "liquid-type": dynamic(() => import("./liquid-type/LiquidType"), { ssr: false, loading: Loading }),
  "particle-field": dynamic(() => import("./particle-field/ParticleField"), { ssr: false, loading: Loading }),
  "pattern-machine": dynamic(() => import("./pattern-machine/PatternMachine"), { ssr: false, loading: Loading }),
  oscilloscope: dynamic(() => import("./oscilloscope/Oscilloscope"), { ssr: false, loading: Loading }),
  "magnetic-dots": dynamic(() => import("./magnetic-dots/MagneticDots"), { ssr: false, loading: Loading }),
  "ascii-room": dynamic(() => import("./ascii-room/AsciiRoom"), { ssr: false, loading: Loading }),
};
