import type { ComponentType } from "react";
import type { WorldType } from "@/lib/types";
import type { WorldProps } from "./types";
import CommandCenterWorld from "./command-center/World";
import RailwayWorld from "./railway/World";
import FashionWorld from "./fashion/World";
import LedgerWorld from "./ledger/World";
import BlueprintWorld from "./blueprint/World";
import LabWorld from "./lab/World";

// Server-side lookup: the [slug] page renders only the chosen world, so the browser downloads only
// that world's client code. To add a world type: add it to WorldType (lib/types.ts) and here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each world narrows its own scene type
export const worlds: Record<WorldType, ComponentType<WorldProps<any>>> = {
  "command-center": CommandCenterWorld,
  railway: RailwayWorld,
  fashion: FashionWorld,
  ledger: LedgerWorld,
  blueprint: BlueprintWorld,
  lab: LabWorld,
};
