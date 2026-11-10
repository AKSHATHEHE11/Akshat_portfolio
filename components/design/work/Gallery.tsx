"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import type { FieldId, Work } from "@/data/design";
import { useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { Lightbox } from "./Lightbox";

type GalleryField = Exclude<FieldId, "visuals">;

// How wide each grid draws a tile (design.css), so next/image sends the right file.
const SIZES: Record<GalleryField, string> = {
  edits: "(min-width: 1680px) 820px, (min-width: 768px) 50vw, 100vw",
  posters: "(min-width: 1680px) 550px, (min-width: 768px) 33vw, 50vw",
  "three-d": "(min-width: 1680px) 550px, (min-width: 768px) 33vw, 50vw",
};

/** A field's tiles in that field's own layout (data-field → design.css), and the lightbox they open. */
export function Gallery({ field, works }: { field: GalleryField; works: Work[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <ul className="dz-grid" data-field={field}>
        {works.map((w, i) => (
          <li key={w.id}>
            <Tile
              work={w}
              sizes={SIZES[field]}
              onOpen={() => {
                play("open");
                setOpen(i);
              }}
            />
          </li>
        ))}
      </ul>
      <Lightbox
        works={works}
        index={open}
        onIndex={setOpen}
        onClose={() => {
          play("close");
          setOpen(null);
        }}
      />
    </>
  );
}

const stop = (v: HTMLVideoElement) => {
  v.pause();
  v.currentTime = 0;
  delete v.dataset.on;
};

/**
 * One piece: its still (the image, or the video's poster) and the caption. With a mouse, a piece with a
 * `preview` plays that muted loop while hovered; the file only loads on the first hover.
 */
function Tile({ work, sizes, onOpen }: { work: Work; sizes: string; onOpen: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();
  const { media: m, preview } = work;
  const moving = m.kind !== "image";

  // never left playing off screen (a scroll under a still pointer may not send pointerleave)
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) stop(v);
    });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <button
      type="button"
      className="dz-tile"
      aria-label={work.meta ? `${work.title}, ${work.meta}` : work.title}
      data-cursor="view"
      data-cursor-label={moving ? "PLAY" : undefined}
      onClick={(e) => {
        e.currentTarget.focus(); // Safari doesn't focus a clicked button; the lightbox returns focus here
        onOpen();
      }}
      onPointerEnter={(e) => {
        if (e.pointerType === "touch") return;
        play("tick");
        const v = video.current;
        if (!v || !preview || reduced) return;
        if (!v.getAttribute("src")) v.src = preview.src;
        v.play().catch(() => {}); // a quick leave interrupts play(); that's fine
      }}
      onPointerLeave={() => video.current && stop(video.current)}
    >
      <span className="dz-tile-media">
        <Image src={m.kind === "image" ? m.src : m.poster} width={m.width} height={m.height} alt={work.alt ?? work.title} sizes={sizes} />
        {preview && (
          <video
            ref={video}
            className="dz-tile-video"
            muted
            loop
            playsInline
            preload="none"
            aria-hidden
            onPlaying={(e) => {
              e.currentTarget.dataset.on = "";
            }}
          />
        )}
        {moving && (
          <span className="dz-tile-play" aria-hidden>
            <Play size={14} strokeWidth={2} fill="currentColor" />
          </span>
        )}
      </span>
      <span className="dz-cap">
        <span className="dz-caps dz-cap-title">{work.title}</span>
        {work.meta && <span className="dz-cap-meta label">{work.meta}</span>}
      </span>
    </button>
  );
}
