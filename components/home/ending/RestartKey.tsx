"use client";
import { useId, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";
import "./ending.css";

const HOLD = 0.7; // seconds
type Hint = "idle" | "hold" | "short" | "go";
const HINT: Record<Hint, string> = {
  idle: "Press and hold to rewind",
  hold: "Keep holding…",
  short: "Hold it a little longer",
  go: "Rewinding",
};

function Face({ label, className }: { label: string; className?: string }) {
  return (
    <span aria-hidden className={cn("tape-face", className)}>
      <span>[ {label} ]</span>
      <span className="tape-dial">
        <svg viewBox="0 0 40 40" className="tape-ring">
          <circle cx="20" cy="20" r="18" />
          <circle cx="20" cy="20" r="18" pathLength={100} />
        </svg>
        <RotateCcw size={16} strokeWidth={2} className="tape-spin" />
      </span>
    </span>
  );
}

/**
 * Hold-to-confirm key. Pointer: press and hold ~0.7s (leaving or releasing early cancels).
 * Keyboard: hold Space/Enter. Assistive tech that sends a bare click (no key/pointer) confirms at once.
 */
export function RestartKey({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const key = useRef<HTMLButtonElement>(null);
  const prog = useRef({ p: 0 });
  const tween = useRef<gsap.core.Tween | null>(null);
  const holding = useRef(false);
  const lastInput = useRef(-1e9);
  const [hint, setHint] = useState<Hint>("idle");
  const hintId = useId();
  const { contextSafe } = useGSAP({ scope: key });

  const paint = () => key.current?.style.setProperty("--p", prog.current.p.toFixed(4));

  const confirm = contextSafe(() => {
    holding.current = false;
    tween.current?.kill();
    prog.current.p = 1;
    paint();
    if (key.current) key.current.dataset.holding = "0";
    setHint("go");
    play("success");
    onConfirm();
    tween.current = gsap.to(prog.current, {
      p: 0,
      delay: 1.8,
      duration: 0.5,
      ease: "power2.out",
      onUpdate: paint,
      onComplete: () => setHint("idle"),
    });
  });

  const start = contextSafe(() => {
    if (holding.current || hint === "go") return;
    holding.current = true;
    lastInput.current = performance.now();
    if (key.current) key.current.dataset.holding = "1";
    setHint("hold");
    play("press");
    tween.current?.kill();
    tween.current = gsap.to(prog.current, { p: 1, duration: HOLD * (1 - prog.current.p), ease: "none", onUpdate: paint, onComplete: confirm });
  });

  const cancel = contextSafe(() => {
    lastInput.current = performance.now();
    if (!holding.current) return;
    holding.current = false;
    if (key.current) key.current.dataset.holding = "0";
    tween.current?.kill();
    tween.current = gsap.to(prog.current, { p: 0, duration: 0.35, ease: "power2.out", onUpdate: paint });
    setHint("short");
    play("toggle-off");
  });

  const isHoldKey = (k: string) => k === " " || k === "Enter";

  return (
    <div>
      <button
        ref={key}
        type="button"
        className="tape-key"
        aria-describedby={hintId}
        data-cursor="hover"
        data-cursor-label="HOLD"
        onPointerDown={(e) => {
          if (e.button === 0) start();
        }}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onBlur={cancel}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (!isHoldKey(e.key)) return;
          e.preventDefault();
          if (!e.repeat) start();
        }}
        onKeyUp={(e) => {
          if (!isHoldKey(e.key)) return;
          e.preventDefault();
          cancel();
        }}
        onClick={() => {
          // a bare click with no pointer/key hold behind it (screen readers, switch access) confirms directly
          if (!holding.current && hint !== "go" && performance.now() - lastInput.current > 800) confirm();
        }}
      >
        <span className="sr-only">{label}</span>
        <Face label={label} />
        <Face label={label} className="tape-fill" />
      </button>
      <p id={hintId} aria-live="polite" className="mt-3 font-mono text-micro uppercase tracking-[0.14em] text-fg-muted">
        {HINT[hint]}
      </p>
    </div>
  );
}
