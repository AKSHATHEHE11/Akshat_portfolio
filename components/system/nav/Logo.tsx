"use client";
import { usePathname } from "next/navigation";
import { useLenis } from "lenis/react";
import { site } from "@/data/site";
import { TLink } from "@/components/ui/TLink";
import { emit, system, useSystem } from "@/lib/system";

const bracket =
  "pointer-events-none absolute inset-y-0 w-[0.45rem] border-y-2 border-(--n-index) transition-transform duration-500 ease-out-expo";

/**
 * [ AKSHAT ] — always goes home. Triple-click flips dev vision (the blueprint).
 * onNavigate: the copy inside the menu panel closes the panel (scroll is stopped while it is open,
 * so on home it jumps to the top underneath instead of gliding).
 */
export function Logo({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const world = useSystem((s) => s.world);
  const lenis = useLenis();

  return (
    <TLink
      href="/"
      kind={world ? "world-exit" : "nav-back"}
      aria-label={`${site.short}, home`}
      data-cursor="hover"
      data-intro=""
      className="group/logo relative inline-flex h-9 shrink-0 select-none items-center px-3.5 font-display text-[0.9375rem] font-[680] uppercase tracking-[0.24em] [font-variation-settings:'wdth'_112]"
      onClick={(e) => {
        const home = pathname === "/";
        // 2nd/3rd click of a triple-click must not navigate again (or restart the page transition)
        if (home || e.detail > 1) e.preventDefault();
        if (e.detail <= 1) {
          if (home) lenis?.scrollTo(0, onNavigate ? { immediate: true, force: true } : undefined);
          onNavigate?.();
        }
        if (e.detail === 3) {
          system.toggleSecret();
          emit("toast", { text: `DEV VISION: ${system.get().secret ? "ON" : "OFF"}` });
        }
      }}
    >
      <span aria-hidden className={`${bracket} left-0 border-l-2 group-hover/logo:-translate-x-1`} />
      <span data-glitch={site.short} className="mr-[-0.24em]">
        {site.short}
      </span>
      <span aria-hidden className={`${bracket} right-0 border-r-2 group-hover/logo:translate-x-1`} />
    </TLink>
  );
}
