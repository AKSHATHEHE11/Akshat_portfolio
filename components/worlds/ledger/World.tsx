"use client";
// STUB — replaced by the ledger world implementation.
import type { WorldProps } from "../types";
import type { LedgerScene } from "./scene";
import { WorldPlaceholder } from "../WorldPlaceholder";

export default function LedgerWorld({ project }: WorldProps<LedgerScene>) {
  return <WorldPlaceholder project={project} />;
}
