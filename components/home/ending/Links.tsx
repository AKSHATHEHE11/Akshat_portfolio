"use client";
import { useEffect, useRef, useState } from "react";
import { profile } from "@/data/profile";
import { TLink } from "@/components/ui/TLink";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { useSystem } from "@/lib/system";
import { cn } from "@/lib/utils";
import { copyText } from "../contact/copy";

const ROW =
  "group/row relative grid grid-cols-[1.5ch_8.5ch_minmax(0,1fr)_auto] items-center gap-x-3 py-3 font-mono text-[0.75rem] " +
  "sm:grid-cols-[2ch_10ch_minmax(0,1fr)_auto] sm:py-3.5 sm:text-[0.8125rem] " +
  "before:pointer-events-none before:absolute before:inset-0 before:origin-left before:scale-x-0 before:bg-fg/[0.05] before:transition-transform before:duration-500 before:ease-out-expo hover:before:scale-x-100";
const ACTION = "relative whitespace-nowrap rounded-[3px] px-1.5 py-0.5 tracking-[0.06em] transition-colors duration-200";
const LIT = "group-hover/row:bg-signal group-hover/row:text-signal-ink";
const RESUME = profile.resume.split("/").pop() ?? profile.resume;

const Prompt = () => (
  <span aria-hidden className="text-signal">
    &gt;
  </span>
);

/** [ ACTION ] — the brackets are drawn, not read out. */
const Brackets = ({ children }: { children: React.ReactNode }) => (
  <>
    <span aria-hidden>[ </span>
    {children}
    <span aria-hidden> ]</span>
  </>
);

/** Contact links as system output: > key  value  [ ACTION ]. Rows type themselves in on first sight. */
export function Links({ className }: { className?: string }) {
  const list = useRef<HTMLUListElement>(null);
  const timer = useRef(0);
  const [copied, setCopied] = useState(false);
  const reduced = useReducedMotion();
  const booted = useSystem((s) => s.booted); // re-arm the type-in after RESTART
  useEffect(() => () => window.clearTimeout(timer.current), []);

  useGSAP(
    () => {
      if (reduced) return;
      gsap.fromTo(
        "[data-row]",
        { clipPath: "inset(0 100% 0 0)" },
        {
          clipPath: "inset(0 0% 0 0)",
          duration: 0.45,
          ease: "steps(14)",
          stagger: 0.12,
          clearProps: "clipPath",
          scrollTrigger: { trigger: list.current, start: "top 88%", once: true },
        },
      );
    },
    { scope: list, dependencies: [reduced, booted], revertOnUpdate: true },
  );

  const copy = async () => {
    play("press");
    if (!(await copyText(profile.email, "EMAIL COPIED"))) return;
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <ul ref={list} aria-label="Contact links" className={cn("border-y border-dashed border-line", className)}>
      <li data-row className={cn(ROW, "border-b border-dashed border-line")}>
        <Prompt />
        <span className="text-fg-muted">email</span>
        {/* -my-3/py-3: the link spans the full row height (touch target), the row stays the same */}
        <a href={`mailto:${profile.email}`} data-cursor="hover" className="relative -my-3 truncate py-3 underline-offset-4 hover:underline sm:-my-3.5 sm:py-3.5">
          {profile.email}
        </a>
        <button
          type="button"
          onClick={copy}
          onPointerEnter={() => play("tick")}
          data-cursor="hover"
          data-chaos-escape
          aria-label={`Copy ${profile.email}`}
          className={cn(ACTION, "hit hover:bg-signal hover:text-signal-ink")}
        >
          <Brackets>
            <span aria-live="polite">{copied ? "COPIED" : "COPY"}</span>
          </Brackets>
        </button>
      </li>

      {profile.socials.map((link) => (
        <li key={link.label} data-row className="border-b border-dashed border-line">
          <TLink href={link.href} data-cursor="hover" onPointerEnter={() => play("tick")} className={ROW}>
            <Prompt />
            <span className="text-fg-muted">{link.label.toLowerCase()}</span>
            <span className="relative truncate">{link.handle}</span>
            <span className={cn(ACTION, LIT)}>
              <Brackets>OPEN</Brackets>
              <span className="sr-only"> {link.label} (opens in a new tab)</span>
            </span>
          </TLink>
        </li>
      ))}

      <li data-row>
        <a href={profile.resume} download data-cursor="hover" onPointerEnter={() => play("tick")} onClick={() => play("drop")} className={ROW}>
          <Prompt />
          <span className="text-fg-muted">resume</span>
          <span className="relative truncate">{RESUME}</span>
          <span className={cn(ACTION, LIT)}>
            <Brackets>DOWNLOAD</Brackets>
          </span>
        </a>
      </li>
    </ul>
  );
}
