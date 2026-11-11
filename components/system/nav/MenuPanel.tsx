"use client";
import { useRef } from "react";
import { profile } from "@/data/profile";
import { site } from "@/data/site";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/marks";
import { TLink } from "@/components/ui/TLink";
import { current, EASE_MACHINE, EASE_OUT, scripted, usePresence } from "@/lib/anim";
import { useIsomorphicLayoutEffect, useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { emit } from "@/lib/system";
import { cn } from "@/lib/utils";
import { useDialog } from "../sheet/useDialog";
import { activeItem } from "./Links";
import { Logo } from "./Logo";
import { ChaosToggle, LightsToggle, SoundToggle } from "./Toggles";
import type { WorldInfo } from "./useWorldInfo";
import { WorkCta } from "./WorkCta";

/** Where the panel irises out of (the MENU key) and how far it has to grow to cover the screen. */
export interface Origin {
  x: number;
  y: number;
  r: number;
}

const micro = "font-mono text-[0.6875rem] uppercase tracking-[0.14em]";

/**
 * The control panel: full-screen dark device face with the whole site on it. Opens from the MENU key
 * (phones, touch, and inside worlds where the bar is reduced to a readout).
 */
export function MenuPanel({
  open,
  origin,
  onClose,
  pathname,
  world,
}: {
  open: boolean;
  origin: Origin;
  /** silent = closing because a link was followed (the page transition makes the noise) */
  onClose: (silent?: boolean) => void;
  pathname: string;
  world: WorldInfo | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useDialog(ref, open, onClose);

  const active = activeItem(pathname);
  const { mounted, done } = usePresence(open);

  // Irises out of the MENU key and folds back into it (reduced motion: a fade). A reopen mid-close
  // carries on from wherever the iris is.
  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const at = `at ${Math.round(origin.x)}px ${Math.round(origin.y)}px`;
    const prop = reduced ? "opacity" : "clipPath";
    const shut = reduced ? "0" : `circle(0px ${at})`;
    const shown = reduced ? "1" : `circle(${Math.round(origin.r)}px ${at})`;
    const running = scripted(el);
    const from = running.length ? String(current(el, [prop])[prop]) : shut;
    running.forEach((a) => a.cancel());
    if (open) {
      el.animate({ [prop]: [from, shown] }, { duration: 800, easing: EASE_OUT, fill: "both" });
      // the links rise in on a fresh open (a reopen mid-close finds them already in place)
      if (!reduced && !running.length)
        el.querySelectorAll("[data-menu-item]").forEach((item, i) =>
          item.animate({ transform: ["translateY(105%)", "none"] }, { duration: 850, delay: 140 + i * 50, easing: EASE_OUT, fill: "backwards" }),
        );
      return;
    }
    el.animate({ [prop]: [from, shut] }, { duration: 450, easing: EASE_MACHINE, fill: "both" }).onfinish = done;
    // only an open/close (or the mount that follows one) animates; origin and reduced are read as they are then
  }, [open, mounted]);

  if (!mounted) return null;

  return (
    <div
      ref={ref}
      id="sys-panel"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      tabIndex={-1}
      data-lenis-prevent=""
      className="sys-panel fixed inset-0 z-[70] flex flex-col overflow-y-auto overscroll-contain bg-ink text-(--n-fg) outline-none"
    >
      {/* same row as the bar underneath, so MENU simply becomes CLOSE */}
      <div className="frame mt-(--safe-top) flex h-(--nav-h) shrink-0 items-center justify-between gap-4">
        <Logo onNavigate={() => onClose(true)} />
        <Button variant="key" size="sm" icon={null} magnetic={false} onClick={() => onClose()}>
          <span aria-hidden className="relative block size-2.5">
            <span className="absolute inset-x-0 top-1/2 h-px rotate-45 bg-current" />
            <span className="absolute inset-x-0 top-1/2 h-px -rotate-45 bg-current" />
          </span>
          Close
        </Button>
      </div>

      <nav aria-label="Menu" className="frame flex flex-1 flex-col justify-center py-6">
        <p className={cn(micro, "mb-3 truncate text-(--n-dim)")}>
          {world ? `World ${world.index}/${world.total} · ${world.title}` : site.version}
        </p>
        <ul className="border-t border-(--n-line)">
          {site.nav.map((item) => {
            const on = item === active;
            return (
              <li key={item.href} className="overflow-hidden border-b border-(--n-line)">
                <div data-menu-item="">
                  <TLink
                    href={item.href}
                    kind={world ? "world-exit" : "nav-forward"}
                    aria-current={on ? "page" : undefined}
                    data-cursor="hover"
                    onPointerEnter={() => play("tick")}
                    onClick={() => onClose(true)}
                    className="group/item flex items-center gap-3 py-[clamp(0.25rem,1.1svh,0.85rem)] sm:gap-5"
                  >
                    <span className="w-7 shrink-0 self-start pt-[0.55em] font-mono text-[0.6875rem] tabular-nums text-(--n-index)">
                      {item.id}
                    </span>
                    <span
                      className={cn(
                        "display text-[clamp(2.6rem,min(13vw,10.5svh),7.5rem)] transition-[translate,color] duration-500 ease-out-expo fine:group-hover/item:translate-x-3",
                        on ? "text-(--n-accent)" : "fine:group-hover/item:text-(--n-accent)",
                      )}
                      style={{ fontVariationSettings: "'wdth' 82" }}
                    >
                      {item.label}
                    </span>
                    {on && (
                      <span className={cn(micro, "hidden self-center text-(--n-accent) sm:inline")}>· Here</span>
                    )}
                    <Kbd className="ml-auto hidden shrink-0 self-center sm:fine:inline-flex">{item.key.toUpperCase()}</Kbd>
                  </TLink>
                </div>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="frame shrink-0 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-3 border-y border-(--n-line) [&>*+*]:border-l [&>*+*]:border-(--n-line)">
          <ChaosToggle variant="panel" />
          <SoundToggle variant="panel" />
          <LightsToggle variant="panel" />
        </div>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 pt-5">
          <WorkCta size="md" onGo={() => onClose(true)} />
          <div className={cn(micro, "flex items-center gap-5 text-(--n-dim)")}>
            <span>
              {profile.location.city} · {profile.location.coords}
            </span>
            <button
              type="button"
              data-cursor="hover"
              className="hidden items-center gap-2 text-(--n-fg) fine:inline-flex"
              onClick={() => {
                onClose(true);
                emit("shortcuts:open");
              }}
            >
              Shortcuts <Kbd>?</Kbd>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
