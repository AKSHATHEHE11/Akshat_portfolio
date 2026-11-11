"use client";
import { useRef, type CSSProperties } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import type { Work } from "@/data/design";
import { useDialog } from "@/components/system/sheet/useDialog";
import { play } from "@/lib/sound";
import { pad } from "@/lib/utils";

// The visitor asked for this video, so it plays with sound; where the browser won't allow that, muted.
// Module scope keeps the ref callback stable: React calls it once per video, not on every render.
function autoplay(v: HTMLVideoElement | null) {
  v?.play().catch((e: DOMException) => {
    // AbortError: closed or stepped past before it started; a retry would play on, detached
    if (e.name !== "NotAllowedError") return;
    v.muted = true;
    v.play().catch(() => {});
  });
}

/**
 * One field's pieces, one at a time, as large as the screen allows. Esc closes, ←/→ (or a sideways
 * swipe on touch) step through the field (wrapping), focus stays inside and returns to the tile, the
 * page underneath doesn't scroll.
 */
export function Lightbox({
  works,
  index,
  onIndex,
  onClose,
}: {
  works: Work[];
  index: number | null;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number; t: number } | null>(null);
  useDialog(ref, index !== null, onClose);
  if (index === null) return null;

  const w = works[index];
  const m = w.media;
  const n = works.length;
  const go = (d: number) => {
    play("click");
    onIndex((index + d + n) % n);
  };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dz-lb-title"
      tabIndex={-1}
      className="dz-lb"
      data-lenis-prevent=""
      data-arrows="local"
      onKeyDown={(e) => {
        // a focused video keeps its own arrow keys (seek)
        if (n < 2 || e.target instanceof HTMLMediaElement) return;
        if (e.key === "ArrowLeft") go(-1);
        else if (e.key === "ArrowRight") go(1);
        else return;
        e.preventDefault();
      }}
    >
      <header className="dz-lb-head">
        <div aria-live="polite" className="dz-lb-caption">
          <h2 id="dz-lb-title" className="dz-caps dz-lb-title">
            {w.title}
          </h2>
          {w.meta && <p className="dz-lb-meta label">{w.meta}</p>}
        </div>
        <button type="button" className="dz-lb-btn label" onClick={onClose} data-cursor="hover">
          Close
          <X size={16} strokeWidth={1.75} aria-hidden />
        </button>
      </header>

      <div
        className="dz-lb-stage"
        onClick={(e) => e.target === e.currentTarget && onClose()}
        onTouchStart={(e) => {
          const t = e.touches[0];
          // one finger, not pinch-zoomed in (then a drag pans the piece)
          swipe.current = e.touches.length === 1 && (window.visualViewport?.scale ?? 1) < 1.01 ? { x: t.clientX, y: t.clientY, t: e.timeStamp } : null;
        }}
        onTouchEnd={(e) => {
          const s = swipe.current;
          swipe.current = null;
          if (!s || n < 2) return;
          const t = e.changedTouches[0];
          const dx = t.clientX - s.x;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(t.clientY - s.y) * 1.5 && e.timeStamp - s.t < 700) go(dx < 0 ? 1 : -1);
        }}
        onTouchCancel={() => (swipe.current = null)}
      >
        <div key={w.id} className="dz-lb-media" style={{ "--ar": `${m.width} / ${m.height}` } as CSSProperties}>
          {m.kind === "image" ? (
            <Image
              src={m.src}
              alt={w.alt ?? w.title}
              fill
              sizes={`min(100vw, ${Math.round((m.width / m.height) * 100)}vh)`}
              loading="eager"
            />
          ) : m.kind === "video" ? (
            // tabIndex makes it a stop in useDialog's focus trap: with one piece there's no Previous/Next after it
            <video ref={autoplay} src={m.src} poster={m.poster} controls playsInline tabIndex={0} />
          ) : (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${m.id}?autoplay=1&rel=0`}
              title={w.title}
              tabIndex={0}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          )}
        </div>
      </div>

      <footer className="dz-lb-foot">
        {n > 1 && (
          <button type="button" className="dz-lb-btn" aria-label="Previous" onClick={() => go(-1)} data-cursor="hover">
            <ArrowLeft size={18} strokeWidth={1.75} aria-hidden />
          </button>
        )}
        <p className="dz-lb-count label">
          {pad(index + 1)} / {pad(n)}
        </p>
        {n > 1 && (
          <button type="button" className="dz-lb-btn" aria-label="Next" onClick={() => go(1)} data-cursor="hover">
            <ArrowRight size={18} strokeWidth={1.75} aria-hidden />
          </button>
        )}
      </footer>
    </div>
  );
}
