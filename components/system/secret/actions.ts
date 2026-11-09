"use client";
import { play } from "@/lib/sound";
import { emit, system } from "@/lib/system";

/** Leave dev vision (Esc, the blueprint's close key). */
export function closeDevVision() {
  play("toggle-off");
  system.toggleSecret(false);
  emit("toast", { text: "DEV VISION: OFF" });
}
