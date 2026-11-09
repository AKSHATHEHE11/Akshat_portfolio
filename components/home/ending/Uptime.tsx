"use client";
import { useEffect, useRef } from "react";
import { useOnScreen } from "@/lib/hooks";
import { clock, sessionSeconds } from "./session";

/** Live session clock (ticks only while visible; no React renders). */
export function Uptime() {
  const ref = useRef<HTMLSpanElement>(null);
  const on = useOnScreen(ref);

  useEffect(() => {
    if (!on) return;
    const tick = () => {
      if (ref.current) ref.current.textContent = clock(sessionSeconds());
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [on]);

  return (
    <span ref={ref} className="tabular-nums text-fg">
      0:00:00
    </span>
  );
}
