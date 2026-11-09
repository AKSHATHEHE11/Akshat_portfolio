"use client";
import { useRef } from "react";
import { usePreview, type PreviewProps } from "./usePreview";
import "./previews.css";

const KNOBS = ["Warp", "Grain", "Feed"];

/** A shader instrument idling: light pooling and drifting under grain, three knobs being worried at. */
export default function Lab({ hot, running }: PreviewProps) {
  const ref = useRef<HTMLDivElement>(null);

  usePreview(
    ref,
    (tl, q) => {
      const [a, b, c] = q("[data-blob]");
      tl.to(a, { xPercent: 38, yPercent: 22, scale: 1.25, duration: 6.5, ease: "sine.inOut", yoyo: true, repeat: -1 }, 0)
        .to(b, { xPercent: -42, yPercent: -18, scale: 0.8, duration: 8.5, ease: "sine.inOut", yoyo: true, repeat: -1 }, 0)
        .to(c, { xPercent: 26, yPercent: -30, scale: 1.35, duration: 10.5, ease: "sine.inOut", yoyo: true, repeat: -1 }, 0);
      q("[data-knob]").forEach((k, i) =>
        tl.fromTo(k, { rotate: -120 + i * 70 }, { rotate: 60 + i * 30, duration: 2.2 + i * 0.9, ease: "sine.inOut", yoyo: true, repeat: -1 }, 0),
      );
    },
    hot,
    running,
  );

  return (
    <div ref={ref} className="wp-lab">
      <span data-blob className="wp-blob" style={{ left: "-12%", top: "-18%", background: "radial-gradient(circle, var(--p-accent), transparent 64%)" }} />
      <span data-blob className="wp-blob" style={{ left: "38%", top: "6%", background: "radial-gradient(circle, #ff5a1f, transparent 62%)" }} />
      <span data-blob className="wp-blob" style={{ left: "8%", top: "40%", background: "radial-gradient(circle, var(--p-fg), transparent 60%)", opacity: 0.55 }} />
      <span className="wp-grain" data-paused={!running || undefined} />
      <div className="wp-knobs">
        {KNOBS.map((k) => (
          <span key={k} className="flex flex-col items-center gap-1.5">
            <span className="wp-knob">
              <i data-knob />
            </span>
            <span className="label text-[0.5625rem] opacity-70">{k}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
