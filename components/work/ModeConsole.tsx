"use client";
import { useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { play } from "@/lib/sound";
import { MODES, type Mode } from "./modes";
import "./work.css";

/**
 * The view switcher: five keycaps with radio-group semantics. Arrow keys move + select inside
 * the group (APG radio pattern); digits 1–5 work page-wide (handled by WorkIndex).
 */
export function ModeConsole({ mode, onChange, tools }: { mode: Mode; onChange: (m: Mode) => void; tools?: ReactNode }) {
  const group = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = MODES.findIndex((m) => m.id === mode);
    const n = MODES.length;
    const j =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? (i + 1) % n
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? (i - 1 + n) % n
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? n - 1
              : -1;
    if (j < 0) return;
    e.preventDefault();
    onChange(MODES[j].id);
    group.current?.querySelectorAll<HTMLButtonElement>("[role='radio']")[j]?.focus();
  };

  return (
    <div className="wk-console" data-in="fade" style={{ "--d": "320ms" } as CSSProperties}>
      <div ref={group} role="radiogroup" aria-label="Browse projects as" className="wk-keys" onKeyDown={onKeyDown}>
        {MODES.map((m, i) => {
          const on = m.id === mode;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={m.label}
              aria-keyshortcuts={String(i + 1)}
              tabIndex={on ? 0 : -1}
              className="wk-key"
              data-on={on || undefined}
              data-in="key"
              data-cursor="hover"
              style={{ "--i": i } as CSSProperties}
              onPointerEnter={() => play("tick")}
              onClick={() => onChange(m.id)}
            >
              <span className="wk-key-num" aria-hidden>
                {i + 1}
              </span>
              <span className="wk-key-led" aria-hidden />
              <span className="wk-key-text">{m.label}</span>
              <span className="wk-key-short" aria-hidden>
                {m.short}
              </span>
            </button>
          );
        })}
      </div>
      <div className="wk-tools">{tools}</div>
    </div>
  );
}
