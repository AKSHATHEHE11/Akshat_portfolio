"use client";
import type { KeyboardEvent, ReactNode } from "react";

const STEP: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

/**
 * Window chrome: a paper body under an ink bar. The whole bar is the drag handle (Windows.tsx gives
 * it to Draggable); the grip button inside is its keyboard twin — arrows move the window, Shift
 * moves it further, Enter brings it to the front.
 */
export function Win({
  id,
  title,
  meta,
  onNudge,
  onFront,
  children,
}: {
  id: string;
  title: string;
  meta?: ReactNode;
  onNudge: (id: string, dx: number, dy: number) => void;
  onFront: (id: string) => void;
  children: ReactNode;
}) {
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const s = STEP[e.key];
    if (!s) return;
    e.preventDefault();
    const k = e.shiftKey ? 64 : 16;
    onNudge(id, s[0] * k, s[1] * k);
  };
  return (
    <section data-win={id} className={`pg-win pg-win-${id}`} aria-labelledby={`pg-win-${id}`} onPointerDownCapture={() => onFront(id)}>
      <header data-grip className="pg-win-bar" data-cursor="drag" data-cursor-label="MOVE">
        <button
          type="button"
          className="pg-win-grip"
          aria-label={`Move the ${title} window. Arrow keys move it.`}
          data-arrows="local"
          onKeyDown={onKey}
          onClick={() => onFront(id)}
        >
          <i />
          <i />
          <i />
        </button>
        <h2 id={`pg-win-${id}`} className="pg-win-title">
          {title}
        </h2>
        {meta ? <span className="pg-win-meta">{meta}</span> : null}
      </header>
      <div className="pg-win-body">{children}</div>
    </section>
  );
}
