import type { ComponentType } from "react";
import { CalmDemo } from "./Calm";
import { DeleteDemo } from "./Delete";
import { ExplainDemo } from "./Explain";
import { MaterialDemo } from "./Material";
import { MotionDemo } from "./Motion";
import type { DemoProps } from "./shared";

/** One demo per principle, in data/think.ts order (a principle past the fifth gets no screen). */
// ponytail: matched by index — give principles an `id` in data/think.ts if their order ever changes.
export const DEMOS: ComponentType<DemoProps>[] = [MotionDemo, DeleteDemo, MaterialDemo, ExplainDemo, CalmDemo];
