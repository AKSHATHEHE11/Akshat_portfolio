"use client";
import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { useChaos } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { setTransitionOrigin, type NavKind } from "@/lib/transitions";
import { isExternal } from "@/lib/utils";

type Props = Omit<ComponentProps<typeof Link>, "href" | "transitionTypes"> & {
  href: string;
  /** which page transition plays (default: nav-forward) */
  kind?: NavKind;
};

/**
 * The site's link. Internal links navigate with a page transition that grows from the click point;
 * external links (http, mailto, tel) open normally (http in a new tab).
 */
export function TLink({ href, kind = "nav-forward", onClick, children, ...rest }: Props) {
  const chaos = useChaos();

  if (isExternal(href)) {
    const newTab = href.startsWith("http");
    return (
      <a
        href={href}
        target={newTab ? "_blank" : undefined}
        rel={newTab ? "noreferrer" : undefined}
        onClick={onClick as ((e: MouseEvent<HTMLAnchorElement>) => void) | undefined}
        {...(rest as ComponentProps<"a">)}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      transitionTypes={chaos ? [kind, "chaos"] : [kind]}
      onClick={(e) => {
        const x = e.clientX || window.innerWidth / 2;
        const y = e.clientY || window.innerHeight / 2;
        setTransitionOrigin(x, y);
        play("whoosh");
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}
