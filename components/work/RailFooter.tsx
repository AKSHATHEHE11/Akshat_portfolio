"use client";
import { useEffect, useRef, type CSSProperties } from "react";
import { useLenis } from "lenis/react";
import { ArrowRight } from "lucide-react";
import { TLink } from "@/components/ui/TLink";
import { clamp } from "@/lib/utils";
import "./work.css";

/**
 * "SCROLL THE RAIL": a sticky strip whose little train rides the ticked rail with page progress.
 * Lenis writes --p (progress) and --v (speed) as CSS vars — no React renders while scrolling.
 */
export function RailFooter() {
  const ref = useRef<HTMLDivElement>(null);

  const write = (progress: number, velocity: number) => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--p", clamp(progress).toFixed(4));
    el.style.setProperty("--v", clamp(Math.abs(velocity) / 40).toFixed(3));
  };

  const lenis = useLenis((l) => write(l.progress, l.velocity));
  useEffect(() => {
    if (lenis) write(lenis.progress, 0);
  }, [lenis]);

  return (
    <div ref={ref} className="wk-rail" data-in="fade" style={{ "--d": "700ms" } as CSSProperties}>
      <span className="wk-rail-label" aria-hidden>
        Scroll the rail <ArrowRight size={14} strokeWidth={1.75} />
      </span>
      <div className="wk-rail-track" aria-hidden>
        <div className="wk-train">
          <span className="wk-speed" />
          <svg viewBox="0 0 76 28">
            <path
              d="M3 21 V11 a3 3 0 0 1 3 -3 H48 L50 4 H62 a3 3 0 0 1 3 3 V8 L72 14 V21 Z"
              fill="currentColor"
            />
            <rect x="53.5" y="7" width="7.5" height="4.2" rx="1" fill="var(--bg)" />
            <path d="M12 10.5 V13.5 M17 10.5 V13.5 M22 10.5 V13.5 M27 10.5 V13.5" stroke="var(--bg)" strokeWidth="1.2" />
            <rect x="3" y="16" width="69" height="1.8" fill="#d8ff00" />
            <circle cx="71.4" cy="18.6" r="1.5" fill="#d8ff00" />
            <rect x="6" y="21" width="62" height="2" fill="currentColor" />
            {[12, 22, 50, 60].map((x) => (
              <g key={x} className="wk-wheel">
                <circle cx={x} cy="23.6" r="3.4" fill="currentColor" stroke="var(--bg)" strokeWidth="1.1" />
                <path d={`M${x - 2.4} 23.6 H${x + 2.4}`} stroke="var(--bg)" strokeWidth="1" />
              </g>
            ))}
          </svg>
        </div>
      </div>
      <TLink href="/about" className="wk-next-stop hit" data-cursor="hover">
        <span>Next stop</span>
        <ArrowRight size={14} strokeWidth={1.75} aria-hidden />
        <b>About me</b>
      </TLink>
    </div>
  );
}
