"use client";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Scramble } from "@/components/ui/Scramble";
import { Led } from "@/components/ui/marks";
import { play } from "@/lib/sound";
import { emit, useSystem } from "@/lib/system";
import { cn } from "@/lib/utils";
import { flipChaos, flipLights, flipSound, originOf, primeInk } from "./actions";

/*
  The console's three switches. "bar" = compact pill in the nav; "panel" = a tile in the menu panel.
  Switch positions are driven by the html data-* attributes (chaos:/dark: variants), which the
  preflight script restores before paint — so a switch never visibly flips on page load.
*/
type Variant = "bar" | "panel";

const micro = "font-mono text-[0.6875rem] uppercase leading-none tracking-[0.12em]";

function Shell({
  variant,
  pressed,
  label,
  onPress,
  onPrime,
  children,
}: {
  variant: Variant;
  pressed: boolean;
  label: string;
  onPress: (el: HTMLButtonElement) => void;
  /** about to be pressed (pointer over it, or focused): load what the press needs */
  onPrime?: () => void;
  children: ReactNode;
}) {
  const panel = variant === "panel";
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={panel ? undefined : label}
      data-cursor="hover"
      data-intro={panel ? undefined : ""}
      onPointerEnter={() => {
        play("tick");
        onPrime?.();
      }}
      onFocus={onPrime}
      onClick={(e) => onPress(e.currentTarget)}
      className={cn(
        "group/t relative inline-flex select-none text-(--n-fg) transition-[translate,background-color,border-color] duration-200 active:translate-y-px",
        panel
          ? "min-h-30 w-full flex-col items-start justify-between gap-6 px-4 py-5 text-left hover:bg-(--n-fg)/[0.04]"
          : "h-9 items-center rounded-full border border-(--n-line) px-3 hover:border-(--n-fg)/45",
      )}
    >
      {children}
    </button>
  );
}

/** Label that folds away in the condensed bar (see .sys-collapse in nav.css). Its margin folds with it.
 *  `late` labels also give way on mid-width screens, to leave room for the links and "Work with me". */
function Collapse({ side, late, children }: { side: "l" | "r"; late?: boolean; children: ReactNode }) {
  return (
    <span className={cn("sys-collapse", late && "sys-collapse-late", side === "l" ? "ml-2.5" : "mr-2.5")}>
      <span>{children}</span>
    </span>
  );
}

function Tile({ name, state, on }: { name: string; state: string; on: boolean }) {
  return (
    <span className={cn(micro, "flex w-full items-baseline justify-between gap-2")}>
      <span>{name}</span>
      <span className={on ? "text-(--n-accent)" : "text-(--n-dim)"}>{state}</span>
    </span>
  );
}

/* ── CHAOS ────────────────────────────────────────────────────────────────── */

function Lever({ big, className }: { big?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        className,
        "relative block shrink-0 rounded-full bg-(--n-fg)/15 shadow-[inset_0_1px_2px_rgb(0_0_0/0.3)] transition-colors duration-300 chaos:bg-(--n-index)",
        big ? "h-7 w-13" : "h-[18px] w-8",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 grid place-items-center rounded-full bg-paper shadow-[0_1px_2px_rgb(0_0_0/0.45)] transition-transform duration-[420ms] ease-snap",
          big ? "size-6 chaos:translate-x-6" : "size-[14px] chaos:translate-x-[14px]",
        )}
      >
        {/* knurled grip */}
        <span className="h-[45%] w-[3px] border-x border-ink/25" />
      </span>
    </span>
  );
}

export function ChaosToggle({ variant = "bar" }: { variant?: Variant }) {
  const on = useSystem((s) => s.chaos);
  return (
    <Shell variant={variant} pressed={on} label="Chaos mode" onPress={(el) => flipChaos(originOf(el))}>
      {variant === "panel" ? (
        <>
          <Lever big />
          <Tile name="Chaos" state={on ? "On" : "Off"} on={on} />
        </>
      ) : (
        <>
          <Led tone={on ? "signal" : "fg"} pulse={on} className={on ? undefined : "opacity-25"} />
          <Collapse side="l">
            <Scramble
              text={on ? "CHAOS: ON" : "CHAOS MODE"}
              trigger="change"
              duration={0.6}
              className={cn(micro, "block min-w-[10ch]")}
            />
          </Collapse>
          <Lever className="ml-2.5" />
        </>
      )}
    </Shell>
  );
}

/* ── SOUND ────────────────────────────────────────────────────────────────── */

function Meter({ on, big }: { on: boolean; big?: boolean }) {
  return (
    <span aria-hidden className={cn("flex items-end", big ? "h-7 gap-[3px]" : "h-3.5 gap-[2px]")}>
      <svg viewBox="0 0 16 16" fill="none" className={cn("self-center", big ? "mr-1.5 size-7" : "mr-0.5 size-3.5")}>
        <path d="M2.5 6h2.6L9 2.8v10.4L5.1 10H2.5z" fill="currentColor" />
      </svg>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            "h-full rounded-[1px] bg-current transition-[scale,opacity] duration-300",
            big ? "w-[3px]" : "w-[2px]",
            on ? "sys-eq" : "scale-y-[0.18] opacity-45",
          )}
        />
      ))}
    </span>
  );
}

export function SoundToggle({ variant = "bar" }: { variant?: Variant }) {
  const on = useSystem((s) => s.sound);
  return (
    <Shell variant={variant} pressed={on} label="Sound" onPress={flipSound}>
      {variant === "panel" ? (
        <>
          <Meter on={on} big />
          <Tile name="Sound" state={on ? "On" : "Off"} on={on} />
        </>
      ) : (
        <>
          <Meter on={on} />
          <Collapse side="l" late>
            <span className={cn(micro, "block")}>Sound</span>
          </Collapse>
        </>
      )}
    </Shell>
  );
}

/* ── LIGHTS ───────────────────────────────────────────────────────────────── */

function Pill({ big }: { big?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative block shrink-0 rounded-full bg-(--n-fg) shadow-[inset_0_1px_3px_rgb(0_0_0/0.5)]",
        big ? "h-7 w-13" : "h-5 w-9",
      )}
    >
      <span
        className={cn(
          // the knob is the lamp: lit while the lights are on, dark once they're off
          "absolute rounded-full bg-signal shadow-[0_0_8px_var(--signal)] transition-[translate,opacity,box-shadow] duration-[420ms] ease-snap dark:opacity-55 dark:shadow-none",
          big ? "top-[5px] left-[5px] size-[18px] dark:translate-x-6" : "top-1 left-1 size-3 dark:translate-x-4",
        )}
      />
    </span>
  );
}

export function LightsToggle({ variant = "bar" }: { variant?: Variant }) {
  const on = useSystem((s) => s.theme === "light");
  // the menu panel only opens on the way to a switch: start fetching the ink right away
  useEffect(() => {
    if (variant === "panel") primeInk();
  }, [variant]);
  return (
    <Shell
      variant={variant}
      pressed={on}
      label="Lights"
      onPrime={primeInk}
      onPress={(el) => {
        const at = originOf(el);
        if (variant !== "panel") return void flipLights(at);
        // the menu panel covers the page (and looks the same in both themes): fold it away first,
        // then pour the ink over the page itself. 480ms = the panel's exit (MenuPanel, 0.45s).
        emit("menu:close");
        window.setTimeout(() => flipLights(at), 480);
      }}
    >
      {variant === "panel" ? (
        <>
          <Pill big />
          <Tile name="Lights" state={on ? "On" : "Off"} on={on} />
        </>
      ) : (
        <>
          <Collapse side="r" late>
            <span className={cn(micro, "block")}>Lights</span>
          </Collapse>
          <Pill />
        </>
      )}
    </Shell>
  );
}

/** "?" keycap — opens the keyboard reference card (components/system/Shortcuts.tsx). */
export function ShortcutsKey() {
  return (
    <Button
      variant="key"
      size="sm"
      icon={null}
      magnetic={false}
      aria-label="Keyboard shortcuts"
      data-intro=""
      className="w-9 px-0!"
      onClick={() => emit("shortcuts:open")}
    >
      ?
    </Button>
  );
}
