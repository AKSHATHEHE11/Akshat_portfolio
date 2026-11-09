"use client";
import { useEffect, useRef } from "react";
import { profile } from "@/data/profile";
import { gsap, useGSAP } from "@/lib/gsap";
import { useChaos, useOnScreen, useReducedMotion } from "@/lib/hooks";
import { useSystem } from "@/lib/system";
import { cn, pad } from "@/lib/utils";

const { status } = profile;
const SEGMENTS = 12;

function setMeter(row: HTMLElement, value: number) {
  const on = Math.round((value / 100) * SEGMENTS);
  row.querySelectorAll<HTMLElement>("[data-seg]").forEach((seg, i) => (seg.dataset.on = i < on ? "1" : "0"));
  const out = row.querySelector<HTMLElement>("[data-val]");
  if (out) out.textContent = `${value}%`;
}

/** Writes the readout at fraction t of its real values — straight to the DOM, no React renders. */
function paint(root: HTMLElement | null, t: number) {
  if (!root) return;
  root.querySelectorAll<HTMLElement>("[data-meter]").forEach((row) => setMeter(row, Math.round(Number(row.dataset.meter) * t)));
  root.querySelectorAll<HTMLElement>("[data-count]").forEach((n) => (n.textContent = pad(Math.round(Number(n.dataset.count) * t))));
}

/** SYSTEM STATUS: segmented meters + counters that count up when seen (and again after a restart). */
export function StatusPanel({ className }: { className?: string }) {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const chaos = useChaos();
  const booted = useSystem((s) => s.booted);
  const visible = useOnScreen(root, "0px");

  useGSAP(
    () => {
      if (reduced) return paint(root.current, 1);
      paint(root.current, 0);
      const o = { t: 0 };
      gsap.to(o, {
        t: 1,
        duration: 1.6,
        ease: "power3.out",
        onUpdate: () => paint(root.current, o.t),
        scrollTrigger: { trigger: root.current, start: "top 85%", once: true },
      });
    },
    { scope: root, dependencies: [reduced, booted], revertOnUpdate: true },
  );

  // Chaos: the readout loses its mind — bugs max out, everything else is noise.
  // Reduced motion gets one still frame of the nonsense instead of a 9 Hz flicker.
  useEffect(() => {
    const el = root.current;
    if (!chaos || !visible || !el) return;
    const noise = () => {
      el.querySelectorAll<HTMLElement>("[data-meter]").forEach((row) => setMeter(row, 18 + Math.floor(Math.random() * 83)));
      el.querySelectorAll<HTMLElement>("[data-count]").forEach((n) => {
        n.textContent = /bug/i.test(n.dataset.label ?? "") ? "99" : pad(Math.floor(Math.random() * 100));
      });
    };
    noise();
    const id = reduced ? 0 : window.setInterval(noise, 110);
    return () => {
      window.clearInterval(id);
      paint(el, 1);
    };
  }, [chaos, visible, reduced]);

  return (
    <aside
      ref={root}
      aria-label="System status"
      className={cn(
        "relative rounded-[12px] border border-line bg-[#141312]/80 px-5 pb-2.5 pt-4 font-mono shadow-[inset_0_1px_0_rgb(255_255_255/0.05)]",
        className,
      )}
    >
      {["left-2 top-2", "right-2 top-2", "bottom-2 left-2", "bottom-2 right-2"].map((pos) => (
        <span key={pos} aria-hidden className={cn("absolute size-1 rounded-full bg-fg/25", pos)} />
      ))}
      <div className="flex items-center justify-between gap-4 pb-3">
        <span className="text-label uppercase tracking-[0.12em]">System status</span>
        <span className="flex items-center gap-2.5 text-micro uppercase tracking-[0.14em] text-signal">
          {status.mode}
          <span aria-hidden className="grid size-4 place-items-center rounded-full border-2 border-signal">
            <span className="size-1.5 rounded-full bg-signal text-signal animate-pulse-dot" />
          </span>
        </span>
      </div>
      <dl>
        {status.meters.map((m) => (
          <div
            key={m.label}
            data-meter={m.value}
            className="grid grid-cols-[minmax(0,1fr)_auto_4.5ch] items-center gap-4 border-t border-dashed border-line py-[0.5rem]"
          >
            <dt className="text-label uppercase tracking-[0.1em]">{m.label}</dt>
            <dd aria-hidden className="flex gap-[3px]">
              {Array.from({ length: SEGMENTS }, (_, i) => (
                <span
                  key={i}
                  data-seg
                  data-on={i < Math.round((m.value / 100) * SEGMENTS) ? "1" : "0"}
                  className="h-[9px] w-[7px] rounded-[1px] bg-fg/15 data-[on=1]:bg-signal data-[on=1]:shadow-[0_0_6px_rgb(255_90_31/0.55)]"
                />
              ))}
            </dd>
            <dd data-val className="text-right text-label tabular-nums">
              {m.value}%
            </dd>
          </div>
        ))}
        {status.counters.map((c) => (
          <div key={c.label} className="flex items-center justify-between border-t border-dashed border-line py-[0.5rem]">
            <dt className="text-label uppercase tracking-[0.1em]">{c.label}</dt>
            <dd data-count={c.value} data-label={c.label} className="text-label tabular-nums text-signal">
              {pad(c.value)}
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
