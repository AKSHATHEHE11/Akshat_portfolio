import type { ComponentType } from "react";
import type { Principle } from "@/data/think";
import { CalmDemo } from "./Calm";
import { DeleteDemo } from "./Delete";
import { ExplainDemo } from "./Explain";
import { MaterialDemo } from "./Material";
import { MotionDemo } from "./Motion";
import type { DemoProps } from "./shared";

/** The live demo for each principle, by its id in data/think.ts (a new principle needs a demo here). */
export const DEMOS: Record<Principle["id"], ComponentType<DemoProps>> = {
  motion: MotionDemo,
  delete: DeleteDemo,
  material: MaterialDemo,
  explain: ExplainDemo,
  calm: CalmDemo,
};
