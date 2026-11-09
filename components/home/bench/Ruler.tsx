import type { Ref } from "react";

/** The bench's front edge — the floor everything lands on. Measured in px, naturally. */
export function Ruler({ ref, still }: { ref: Ref<HTMLDivElement>; still: boolean }) {
  return (
    <div ref={ref} className="bn-ruler">
      <div aria-hidden className="bn-ticks" />
      <div aria-hidden className="bn-nums">
        {Array.from({ length: 32 }, (_, i) => (
          <span key={i} style={{ left: i * 100 }}>
            {i === 0 ? "0 PX" : i * 100}
          </span>
        ))}
      </div>
      <p className="bn-plate" data-chaos-drift>
        {/* reduced motion: no physics, so only the keys still do something */}
        <span className="max-sm:hidden">{still ? "Bench 01 — double-tap a key" : "Bench 01 — drag, throw, double-tap a key"}</span>
        <span className="sm:hidden">{still ? "Tap a key twice" : "Drag · throw · tap a key twice"}</span>
      </p>
    </div>
  );
}
