"use client";
import { useRef } from "react";
import { motion } from "motion/react";
import { site, type NavItem } from "@/data/site";
import { Magnetic } from "@/components/ui/Magnetic";
import { TLink } from "@/components/ui/TLink";
import { gsap, useGSAP } from "@/lib/gsap";
import { useChaos, useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";

/** The nav item that owns a route (/work/fybr8 → Work). */
export function activeItem(pathname: string) {
  return site.nav.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
}

// The marker is a physical slider: a little overshoot when it lands. Looser in chaos.
const MARKER = { type: "spring", stiffness: 380, damping: 26, mass: 0.8 } as const;
const MARKER_CHAOS = { type: "spring", stiffness: 300, damping: 9, mass: 0.9 } as const;

const underline =
  "after:absolute after:inset-x-0 after:-bottom-[3px] after:h-px after:origin-right after:scale-x-0 after:bg-current after:transition-transform after:duration-500 after:ease-out-expo group-hover/link:after:origin-left group-hover/link:after:scale-x-100 group-focus-visible/link:after:origin-left group-focus-visible/link:after:scale-x-100";

export function Links({ pathname }: { pathname: string }) {
  const ref = useRef<HTMLElement>(null);
  const active = activeItem(pathname);
  const reduced = useReducedMotion();
  const chaos = useChaos();
  const { contextSafe } = useGSAP({ scope: ref });

  const decode = contextSafe((el: HTMLElement | null, text: string) => {
    play("tick");
    if (!el || reduced) return;
    gsap.to(el, { duration: 0.45, scrambleText: { text, chars: "0123456789", speed: 1 }, ease: "none", overwrite: true });
  });

  const spring = chaos ? MARKER_CHAOS : MARKER;

  return (
    <nav ref={ref} aria-label="Primary" className="hidden items-center lg:fine:flex">
      {/* the slider's parking slot: home has no item, so the marker rests here */}
      <span aria-hidden className="flex w-4 justify-center" data-intro="">
        {!active && (
          <motion.span
            layoutId="sys-nav-marker"
            transition={spring}
            className="block size-2 rounded-[2px] bg-(--n-accent) chaos:bg-signal"
          />
        )}
      </span>
      <ul className="flex items-center gap-[clamp(0.125rem,0.7vw,0.875rem)]">
        {site.nav.map((item) => (
          <Item key={item.href} item={item} on={item === active} spring={spring} decode={decode} />
        ))}
      </ul>
    </nav>
  );
}

function Item({
  item,
  on,
  spring,
  decode,
}: {
  item: NavItem;
  on: boolean;
  spring: typeof MARKER | typeof MARKER_CHAOS;
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
            <motion.span
              layoutId="sys-nav-marker"
              transition={spring}
              className="absolute inset-0 rounded-[6px] bg-(--n-accent) chaos:-rotate-2 chaos:bg-signal"
            />
          )}
          <span
            ref={index}
            data-glitch={item.id}
            className={cn("relative tabular-nums", on ? "text-(--n-accent-ink)" : "text-(--n-index)")}
          >
            {item.id}
          </span>
          <span aria-hidden className={cn("relative", on ? "text-(--n-accent-ink)/45" : "text-(--n-dim)")}>
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
