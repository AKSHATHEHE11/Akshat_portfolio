"use client";
import "./secret.css";
import { BlueprintPanel } from "./BlueprintPanel";
import { Grid } from "./Grid";
import { Inspector } from "./Inspector";

/** Loaded on demand by components/system/SecretMode.tsx the first time dev vision opens. */
export default function DevVision() {
  return (
    <>
      <Grid />
      <Inspector />
      <BlueprintPanel />
    </>
  );
}
