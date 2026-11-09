"use client";
import { useId, useState } from "react";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";
import "./identity.css";

function Art({ id, ring }: { id: string; ring: string }) {
  return (
    <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
      <defs>
        <path id={id} d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" />
      </defs>
      <circle cx="50" cy="50" r="49.5" fill="#ff5a1f" />
      <circle cx="50" cy="50" r="45.5" fill="none" stroke="#111" strokeWidth="0.8" strokeDasharray="1.4 2.2" />
      <circle cx="50" cy="50" r="28.5" fill="none" stroke="#111" strokeWidth="1" />
      <text className="font-mono" fontSize="6.9" fontWeight="600" letterSpacing="1.25" fill="#111">
        <textPath href={`#${id}`}>{ring}</textPath>
      </text>
      <text x="50" y="53" textAnchor="middle" className="font-display" fontSize="23" fontWeight="900" letterSpacing="-1.2" fill="#111">
        QC
      </text>
      <text x="50" y="64.5" textAnchor="middle" className="font-mono" fontSize="6.4" fontWeight="600" letterSpacing="1.3" fill="#111">
        PASSED
      </text>
    </svg>
  );
}

/**
 * The QC sticker. Hover lifts its corner (CSS 3D, a flap hinged on the diagonal), click/tap peels it
 * back for good — revealing what was printed underneath.
 */
export function Sticker({ under, ring, className }: { under: string; ring: string; className?: string }) {
  const [peeled, setPeeled] = useState(false);
  const uid = useId().replace(/[^\w-]/g, "");
  return (
    <div className={cn("dsheet-sticker", className)} data-peeled={peeled}>
      <p className="dsheet-under">{under}</p>
      <button
        type="button"
        className="dsheet-peel"
        aria-pressed={peeled}
        aria-label={peeled ? "Stick the QC sticker back down" : "Peel the QC sticker"}
        data-cursor="hover"
        data-cursor-label={peeled ? "STICK" : "PEEL"}
        onPointerEnter={() => play("tick")}
        onClick={() => {
          play(peeled ? "press" : "open");
          setPeeled(!peeled);
        }}
      >
        <span className="dsheet-base">
          <Art id={`${uid}-a`} ring={ring} />
        </span>
        <span className="dsheet-flap">
          <span className="dsheet-front">
            <Art id={`${uid}-b`} ring={ring} />
          </span>
          <span className="dsheet-back" />
        </span>
      </button>
    </div>
  );
}
