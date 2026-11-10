"use client";
import { useRef, useState, type ReactNode } from "react";
import { useOnScreen } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/**
 * A patch of mat that holds one toy. The toy's static shell renders straight away; `near` latches
 * true about a screen before it scrolls in (load heavy parts then) and `active` is true only while
 * it is on screen (run loops then). Zones never transform — the bug layer inside one is positioned
 * against the mat, not the zone.
 */
export function Zone({
  area,
  rail,
  className,
  children,
}: {
  area: string;
  /** label for the global scroll rail */
  rail?: string;
  className?: string;
  children: (s: { near: boolean; active: boolean }) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useOnScreen(ref, "90% 0px");
  const active = useOnScreen(ref, "40px 0px");
  const [near, setNear] = useState(false);
  if (close && !near) setNear(true);
  return (
    <div
      ref={ref}
      id={rail ? `pg-${area}` : undefined}
      data-rail={rail}
      className={cn("pg-zone", `pg-zone-${area}`, className)}
      style={{ gridArea: area }}
      data-zone={area}
    >
      {children({ near, active })}
    </div>
  );
}
