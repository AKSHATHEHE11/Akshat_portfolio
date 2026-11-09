"use client";
// STUB — replaced by the world-shell implementation (project rail, ESC exit, ←/→ switching, finale).
import { useEffect } from "react";
import { system } from "@/lib/system";
import type { ProjectSummary } from "@/lib/types";

export default function WorldShell({
  current,
  children,
}: {
  current: ProjectSummary;
  all: ProjectSummary[];
  children: React.ReactNode;
}) {
  useEffect(() => {
    system.setWorld(current.slug);
    return () => system.setWorld(null);
  }, [current.slug]);
  return <>{children}</>;
}
