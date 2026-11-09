"use client";
import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useRise } from "./useRise";
import "./worlds.css";

/** PROJECT / Worlds* — the asterisk is footnoted by <Footnote>. */
export function Heading({ className }: { className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useRise(ref);
  return (
    <h2 ref={ref} data-chaos-type className={className}>
      <span className="block overflow-clip pb-[0.06em]">
        <span data-rise className="display block">
          Project
        </span>
      </span>
      <span className="-mt-[0.08em] block overflow-clip pr-[0.5em] pb-[0.14em]">
        <span data-rise className="serif-accent block pl-[0.04em] leading-[0.9]">
          Worlds
          <span aria-hidden data-asterisk className="wd-asterisk">
            *
          </span>
        </span>
      </span>
    </h2>
  );
}

export function Footnote({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-start gap-6", className)}>
      <p className="serif-accent max-w-[19ch] text-title leading-[1.04]">
        <span aria-hidden data-chaos-drift className="wd-asterisk text-[0.8em]">
          *
        </span>
        Not case studies. Rooms, each built to its own rules.
      </p>
      <Button href="/work" variant="ghost" size="sm">
        All work, as a list
      </Button>
    </div>
  );
}
