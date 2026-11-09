"use client";
import { useEffect, useState, type CSSProperties, type MouseEvent } from "react";
import { Led } from "@/components/ui/marks";
import { play } from "@/lib/sound";
import { system, useSystem } from "@/lib/system";
import { cn } from "@/lib/utils";

// Loose keycaps peeking in from the screen edges. Hover / focus pops one out (with a click);
// each does what its legend says: C calms the site down (chaos off — mirrors the C shortcut),
// S toggles sound, ! sets off a burst.
type Id = "calm" | "sound" | "bang";
const KEYS: { id: Id; glyph: string; side: "left" | "right"; top: string; rot: number }[] = [
  { id: "calm", glyph: "C", side: "left", top: "56%", rot: 9 },
  { id: "sound", glyph: "S", side: "left", top: "74%", rot: -7 },
  { id: "bang", glyph: "!", side: "right", top: "78%", rot: -10 },
];

export function Keycaps({
  on,
  compact,
  reduced,
  onBang,
}: {
  on: boolean;
  compact: boolean;
  reduced: boolean;
  onBang: (x: number, y: number) => void;
}) {
  const sound = useSystem((s) => s.sound);
  // first paint parked off-screen, then slide in
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const press = (id: Id, e: MouseEvent<HTMLButtonElement>) => {
    if (id === "calm") {
      play("toggle-off");
      system.toggleChaos(false);
    } else if (id === "sound") {
      system.toggleSound();
      play("toggle-on"); // silent when sound just went off
    } else {
      const r = e.currentTarget.getBoundingClientRect();
      onBang(r.left + r.width / 2, r.top + r.height / 2);
    }
  };

  const keys = KEYS.filter((k) => !(reduced && k.id === "bang") && !(compact && k.id === "sound"));
  const live = shown && on;
  return keys.map((k, i) => {
    const left = k.side === "left";
    const legend = k.id === "calm" ? "Calm" : k.id === "sound" ? "Snd" : "Bang";
    const label =
      k.id === "calm" ? "Calm down: turn chaos mode off" : k.id === "sound" ? "Interface sound" : "Bang: set off a burst";
    return (
      <button
        key={k.id}
        type="button"
        aria-label={label}
        aria-pressed={k.id === "sound" ? sound : undefined}
        // parked off-screen (boot screen up, or sliding away on exit): not a tab stop
        tabIndex={live ? undefined : -1}
        data-cursor="hover"
        data-on={live ? "1" : "0"}
        onPointerEnter={() => play("click")}
        onClick={(e) => press(k.id, e)}
        style={
          {
            top: `min(${k.top}, calc(100% - var(--cx-bottom) - ${compact ? "4.25rem" : "5.25rem"}))`,
            "--out": left ? "-135% 0" : "135% 0",
            "--peek": left ? "-46% 0" : "46% 0",
            "--pop": left ? "0.75rem 0" : "-0.75rem 0",
            "--rot": `${k.rot}deg`,
            "--d": `${120 + i * 90}ms`,
          } as CSSProperties
        }
        className={cn(
          "pointer-events-auto absolute flex flex-col justify-between rounded-key border border-ink/20 bg-paper text-ink shadow-key",
          "[translate:var(--out)] [rotate:var(--rot)] [transition-delay:var(--d)]",
          "transition-[translate,rotate,scale,box-shadow] duration-700 ease-out-expo",
          "data-[on=0]:pointer-events-none data-[on=0]:ease-[cubic-bezier(0.65,0,0.35,1)] data-[on=0]:[transition-delay:0ms]",
          "data-[on=1]:[translate:var(--peek)] data-[on=1]:hover:[translate:var(--pop)] data-[on=1]:focus-visible:[translate:var(--pop)]",
          "hover:[rotate:0deg] hover:[transition-delay:0ms] focus-visible:[rotate:0deg] focus-visible:[transition-delay:0ms]",
          "active:scale-[0.96] active:shadow-key-down",
          left ? "left-0 items-end" : "right-0 items-start",
          compact ? "size-14 p-1.5" : "size-[4.5rem] p-2",
        )}
      >
        <span className="flex items-center gap-1.5">
          {k.id === "sound" && (sound ? <Led tone="go" className="size-1.5" /> : <span className="size-1.5 rounded-full bg-ink/25" />)}
          <span className="label text-[0.5625rem]">{legend}</span>
        </span>
        <span aria-hidden className={cn("font-display font-[820] leading-[0.8]", compact ? "text-[1.35rem]" : "text-[1.7rem]")}>
          {k.glyph}
        </span>
      </button>
    );
  });
}
