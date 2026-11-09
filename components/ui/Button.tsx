"use client";
import type { ComponentProps, ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { play } from "@/lib/sound";
import type { NavKind } from "@/lib/transitions";
import { cn } from "@/lib/utils";
import { Magnetic } from "./Magnetic";
import { TLink } from "./TLink";

/*
  The one button. Every clickable "thing" on the site speaks this language:
  hover  → magnetic pull + a fill that sweeps up from the bottom + the icon nudges
  press  → travels down 2px like a key, shadow collapses
  sound  → tick on hover, press on click (only if sound is on)
*/

type Variant = "ink" | "ghost" | "accent" | "signal" | "key";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, { base: string; fill: string; hoverText: string }> = {
  ink: { base: "bg-fg text-bg rounded-full", fill: "bg-accent", hoverText: "group-hover/btn:text-accent-ink" },
  ghost: {
    base: "border border-line-strong text-fg rounded-full",
    fill: "bg-fg",
    hoverText: "group-hover/btn:text-bg",
  },
  accent: { base: "bg-accent text-accent-ink rounded-full", fill: "bg-fg", hoverText: "group-hover/btn:text-bg" },
  signal: { base: "bg-signal text-signal-ink rounded-full", fill: "bg-fg", hoverText: "group-hover/btn:text-bg" },
  key: {
    base: "bg-surface text-fg rounded-key border border-line shadow-key active:shadow-key-down font-mono uppercase tracking-[0.1em]",
    fill: "bg-accent",
    hoverText: "group-hover/btn:text-accent-ink",
  },
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[0.8125rem] gap-2",
  md: "h-12 px-6 text-[0.95rem] gap-3",
  lg: "h-14 px-8 text-[1.05rem] gap-3",
};

interface Common {
  variant?: Variant;
  size?: Size;
  /** trailing icon. Default: ↗ arrow for links, nothing for buttons. Pass null for none. */
  icon?: ReactNode | null;
  magnetic?: boolean;
  className?: string;
  children: ReactNode;
}

type AsLink = Common & { href: string; kind?: NavKind } & Omit<ComponentProps<"a">, "href" | "className" | "children">;
type AsButton = Common & { href?: undefined } & Omit<ComponentProps<"button">, "className" | "children">;

function Inner({ variant, children, icon }: { variant: Variant; children: ReactNode; icon: ReactNode }) {
  const v = variants[variant];
  return (
    <>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 origin-bottom scale-y-0 transition-transform duration-[460ms] ease-out-expo group-hover/btn:scale-y-100",
          v.fill,
        )}
      />
      <span className={cn("relative z-[1] inline-flex items-center gap-[inherit] transition-colors duration-200", v.hoverText)}>
        {children}
        {icon ? (
          <span className="inline-flex transition-transform duration-300 ease-out-expo group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5">
            {icon}
          </span>
        ) : null}
      </span>
    </>
  );
}

export function Button(props: AsLink | AsButton) {
  const { variant = "ink", size = "md", icon, magnetic = true, className, children, ...rest } = props;
  const classes = cn(
    "group/btn relative inline-flex select-none items-center justify-center overflow-hidden whitespace-nowrap font-medium",
    "transition-[transform,box-shadow] duration-150 ease-out-quart active:translate-y-[2px]",
    "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal",
    variants[variant].base,
    sizes[size],
    className,
  );

  let el: ReactNode;
  if (rest.href !== undefined) {
    const { href, kind, onClick, ...anchorRest } = rest as Omit<AsLink, keyof Common>;
    const resolvedIcon = icon === undefined ? <ArrowUpRight size={size === "sm" ? 14 : 18} strokeWidth={1.75} /> : icon;
    el = (
      <TLink
        href={href}
        kind={kind}
        className={classes}
        data-cursor="hover"
        onPointerEnter={() => play("tick")}
        onClick={(e) => {
          play("press");
          onClick?.(e);
        }}
        {...anchorRest}
      >
        <Inner variant={variant} icon={resolvedIcon}>
          {children}
        </Inner>
      </TLink>
    );
  } else {
    const { onClick, type, ...buttonRest } = rest as Omit<AsButton, keyof Common>;
    el = (
      <button
        type={type ?? "button"}
        className={classes}
        data-cursor="hover"
        onPointerEnter={() => play("tick")}
        onClick={(e) => {
          play("press");
          onClick?.(e);
        }}
        {...buttonRest}
      >
        <Inner variant={variant} icon={icon ?? null}>
          {children}
        </Inner>
      </button>
    );
  }

  return magnetic ? <Magnetic>{el}</Magnetic> : el;
}
