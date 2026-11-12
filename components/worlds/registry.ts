import type { ComponentType } from "react";
import type { WorldType } from "@/lib/types";
import type { WorldProps } from "./types";
import CommandCenterWorld from "./command-center/World";
import RailwayWorld from "./railway/World";
import LedgerWorld from "./ledger/World";
import BlueprintWorld from "./blueprint/World";
import LabWorld from "./lab/World";
import ShowcaseWorld from "./showcase/World";

// Server-side lookup: the [slug] page renders only the chosen world, so the browser downloads only
// that world's client code. To add a world type: add it to WorldType (lib/types.ts) and here.
// A project with a real website gets the plain showcase page (its own fonts and colours, the site
// inside, a link out): Fybr8 as is, Safar Zaika with its train ride under the site. The others keep
// their world until their real details arrive.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each world narrows its own scene type
export const worlds: Record<WorldType, ComponentType<WorldProps<any>>> = {
  "command-center": CommandCenterWorld,
  railway: RailwayWorld,
  fashion: ShowcaseWorld,
  ledger: LedgerWorld,
  blueprint: BlueprintWorld,
  lab: LabWorld,
};
