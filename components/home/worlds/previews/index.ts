import type { ComponentType } from "react";
import type { WorldType } from "@/lib/types";
import Blueprint from "./Blueprint";
import Command from "./Command";
import Fashion from "./Fashion";
import Lab from "./Lab";
import Ledger from "./Ledger";
import Railway from "./Railway";
import type { PreviewProps } from "./usePreview";

/** One live miniature per world type. */
export const PREVIEWS: Record<WorldType, ComponentType<PreviewProps>> = {
  "command-center": Command,
  railway: Railway,
  fashion: Fashion,
  ledger: Ledger,
  blueprint: Blueprint,
  lab: Lab,
};
