"use client";
import { useRef, useState, type Ref } from "react";
import { site, type NavItem } from "@/data/site";
import { Magnetic } from "@/components/ui/Magnetic";
import { TLink } from "@/components/ui/TLink";
import { sharedElement, spring } from "@/lib/anim";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { system } from "@/lib/system";
import { cn } from "@/lib/utils";

/** The nav item that owns a route (/work/fybr8 → Work). */
export function activeItem(pathname: string) {
  return site.nav.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
}

// The marker is a physical slider: a little overshoot when it lands. Looser in chaos.
const MARKER = { stiffness: 380, damping: 26, mass: 0.8 };
const MARKER_CHAOS = { stiffness: 300, damping: 9, mass: 0.9 };

const underline =
  "after:absolute after:inset-x-0 after:-bottom-[3px] after:h-px after:origin-right after:scale-x-0 after:bg-current after:transition-transform after:duration-500 after:ease-out-expo group-hover/link:after:origin-left group-hover/link:after:scale-x-100 group-focus-visible/link:after:origin-left group-focus-visible/link:after:scale-x-100";

export function Links({ pathname }: { pathname: string }) {
  const ref = useRef<HTMLElement>(null);
  const active = activeItem(pathname);
  const reduced = useReducedMotion();
  const { contextSafe } = useGSAP({ scope: ref });
  // one marker, rendered under whichever item is active: it glides from the old item to the new one
  const [marker] = useState(() =>
    sharedElement(() => {
      const s = system.get();
      return s.reducedMotion ? null : spring(s.chaos ? MARKER_CHAOS : MARKER);
    }),
  );

  const decode = contextSafe((el: HTMLElement | null, text: string) => {
    play("tick");
    if (!el || reduced) return;
    gsap.to(el, { duration: 0.45, scrambleText: { text, chars: "0123456789", speed: 1 }, ease: "none", overwrite: true });
  });

  return (
    <nav ref={ref} aria-label="Primary" className="hidden items-center lg:fine:flex">
      {/* the slider's parking slot: home has no item, so the marker rests here */}
      <span aria-hidden className="flex w-4 justify-center" data-intro="">
        {!active && (
          <span ref={marker} className="block size-2 rounded-[2px] bg-(--n-accent) chaos:bg-signal" />
        )}
      </span>
      <ul className="flex items-center gap-[clamp(0.125rem,0.7vw,0.875rem)]">
        {site.nav.map((item) => (
          <Item key={item.href} item={item} on={item === active} marker={marker} decode={decode} />
        ))}
      </ul>
    </nav>
  );
}

function Item({
  item,
  on,
  marker,
  decode,
}: {
  item: NavItem;
  on: boolean;
  marker: Ref<HTMLSpanElement>;
  decode: (el: HTMLElement | null, text: string) => void;
}) {
  const index = useRef<HTMLSpanElement>(null);
  const hello = () => decode(index.current, item.id);

  return (
    <li data-intro="">
      <Magnetic strength={0.2}>
        <TLink
          href={item.href}
          aria-current={on ? "page" : undefined}
          data-cursor="hover"
          onPointerEnter={hello}
          onFocus={hello}
          className="group/link relative flex h-9 items-center gap-1.5 rounded-[6px] px-2 font-mono xl:px-2.5 text-[0.75rem] uppercase leading-none tracking-[0.12em]"
        >
          {on && (
            <span ref={marker} className="absolute inset-0 rounded-[6px] bg-(--n-accent) chaos:-rotate-2 chaos:bg-signal" />
          )}
          <span
            ref={index}
            data-glitch={item.id}
            className={cn("relative tabular-nums max-xl:hidden", on ? "text-(--n-accent-ink)" : "text-(--n-index)")}
          >
            {item.id}
          </span>
          <span aria-hidden className={cn("relative max-xl:hidden", on ? "text-(--n-accent-ink)/45" : "text-(--n-dim)")}>
            /
          </span>
          <span data-glitch={item.label} className={cn("relative", on ? "text-(--n-accent-ink)" : underline)}>
            {item.label}
          </span>
        </TLink>
      </Magnetic>
    </li>
  );
}
