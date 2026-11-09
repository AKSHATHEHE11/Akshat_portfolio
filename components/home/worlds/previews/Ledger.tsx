"use client";
import { useRef } from "react";
import { pad, seeded } from "@/lib/utils";
import { usePreview, type PreviewProps } from "./usePreview";
import "./previews.css";

const sign = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2)}`;

/** A receipt printer feeding reason codes, a score line drawing itself, a tape of deltas. */
export default function Ledger({ p, hot, running }: PreviewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const seed = Number(p.id) * 101;
  const rows = Array.from({ length: 12 }, (_, k) =>
    k % 6 === 5 ? "· · · · · · · ·" : `R-${pad(1 + Math.floor(seeded(seed + k) * 40))}   ${sign((seeded(seed + k * 7) * 2 - 1) * 0.4)}`,
  );
  const spark = Array.from({ length: 13 }, (_, k) => seeded(seed + k * 3) - 0.56)
    .reduce<number[]>((ys, d) => [...ys, Math.min(44, Math.max(6, (ys.at(-1) ?? 30) + d * 16))], [])
    .map((v, k) => `${k ? "L" : "M"}${((k * 100) / 12).toFixed(1)} ${v.toFixed(1)}`)
    .join("");
  const tape = Array.from({ length: 8 }, (_, k) => {
    const v = (seeded(seed + k * 11) * 2 - 1) * 1.4;
    return `${v >= 0 ? "▲" : "▼"} ${Math.abs(v).toFixed(2)}`;
  }).join("     ");
  const reasons = [0.82, 0.64, 0.47, 0.33, 0.21];

  usePreview(
    ref,
    (tl, q) => {
      tl.fromTo(q("[data-feed]"), { yPercent: -50 }, { yPercent: 0, duration: 18, ease: "none", repeat: -1 }, 0)
        .fromTo(q("[data-line]"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2.8, ease: "power1.inOut", repeat: -1, repeatDelay: 1.4 }, 0)
        .to(q("[data-tick]"), { xPercent: -50, duration: 14, ease: "none", repeat: -1 }, 0)
        .to(q("[data-led]"), { opacity: 0.2, duration: 0.3, ease: "steps(1)", yoyo: true, repeat: -1 }, 0);
      q("[data-reason]").forEach((el, i) =>
        tl.fromTo(
          el,
          { scaleX: reasons[i] },
          { scaleX: reasons[i] * (0.55 + seeded(seed + i) * 0.4), duration: 1.6 + i * 0.35, ease: "sine.inOut", yoyo: true, repeat: -1 },
          0,
        ),
      );
    },
    hot,
    running,
  );

  return (
    <div ref={ref} className="wp-ledger">
      <div className="wp-reasons">
        {reasons.map((r, i) => (
          <span key={i} data-reason style={{ transform: `scaleX(${r})` }} />
        ))}
      </div>
      <div className="wp-paper">
        <div data-feed>
          {[0, 1].map((n) => (
            <div key={n}>
              {rows.map((r, i) => (
                <p key={i}>{r}</p>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="wp-slot">
        <i data-led />
      </div>
      <svg className="wp-spark" viewBox="0 0 100 50">
        <path d={spark} pathLength={1} data-line />
      </svg>
      <div className="wp-ticker">
        <div data-tick className="flex w-max">
          <span>{tape}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
          <span>{tape}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
        </div>
      </div>
    </div>
  );
}
