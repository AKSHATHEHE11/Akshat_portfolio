"use client";
import { useRef } from "react";
import { usePreview, type PreviewProps } from "./usePreview";
import "./previews.css";

/** A lookbook spread: the name in kinetic italic serif running behind a swatch of raw twill. */
export default function Fashion({ p, hot, running }: PreviewProps) {
  const ref = useRef<HTMLDivElement>(null);

  usePreview(
    ref,
    (tl, q) => {
      tl.to(q("[data-run]"), { xPercent: -50, duration: 20, ease: "none", repeat: -1 }, 0)
        .to(
          q("[data-ch]"),
          { scaleY: 1.24, skewX: -8, duration: 0.85, ease: "sine.inOut", stagger: { each: 0.06, repeat: -1, yoyo: true } },
          0,
        )
        .to(q("[data-swatch]"), { rotate: -2.5, y: -8, duration: 3.4, ease: "sine.inOut", yoyo: true, repeat: -1 }, 0)
        .to(q("[data-tag]"), { rotate: 9, duration: 1.7, ease: "sine.inOut", yoyo: true, repeat: -1 }, 0);
    },
    hot,
    running,
  );

  const word = [...`${p.title} — `];
  const half = (k: number) => (
    <span className="flex">
      {[0, 1].map((n) =>
        word.map((c, i) => (
          <span key={`${k}${n}${i}`} data-ch className="inline-block origin-bottom whitespace-pre">
            {c}
          </span>
        )),
      )}
    </span>
  );

  return (
    <div ref={ref} className="wp-fashion">
      <div className="wp-type">
        <div data-run className="flex w-max">
          {half(0)}
          {half(1)}
        </div>
      </div>
      <div data-swatch className="wp-denim">
        <span className="wp-stitch" />
        <span className="wp-patch">
          <span className="serif-accent">{p.title}</span>
        </span>
      </div>
      <span data-tag className="wp-tag">
        <span className="label">№ {p.id}</span>
      </span>
    </div>
  );
}
