"use client";
import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { notes, type FieldNote } from "@/data/think";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useChaos, useCoarse, useOnScreen, useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { pad } from "@/lib/utils";

const GARBLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>_#";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const dot = (date: string) => date.replace("-", ".");
/** "2026-10" → "October 2026", for screen readers (the margin shows 2026.10) */
const spoken = (date: string) => `${MONTHS[Number(date.slice(5, 7)) - 1] ?? ""} ${date.slice(0, 4)}`.trim();

function NoteRow({ note, index, open, onToggle }: { note: FieldNote; index: number; open: boolean; onToggle: () => void }) {
  const li = useRef<HTMLLIElement>(null);
  const out = useRef<HTMLSpanElement>(null);
  const typed = useRef(false);
  const coarse = useCoarse();
  const reduced = useReducedMotion();
  const bodyId = `tk-note-${index}`;
  const { contextSafe } = useGSAP({ scope: li });

  // the preview prints itself once, a character at a time, into one text node
  const type = contextSafe(() => {
    const el = out.current;
    if (!el || typed.current) return;
    typed.current = true;
    const text = note.preview;
    const node = el.appendChild(document.createTextNode(reduced ? text : ""));
    if (reduced) return;
    li.current?.setAttribute("data-typing", "");
    const o = { n: 0 };
    let shown = 0;
    gsap.to(o, {
      n: text.length,
      duration: Math.min(1.5, text.length * 0.022),
      ease: "none",
      onUpdate: () => {
        const k = Math.round(o.n);
        if (k === shown) return;
        shown = k;
        node.data = text.slice(0, k);
        play("type");
      },
      onComplete: () => li.current?.removeAttribute("data-typing"),
    });
  });

  // touch has no hover: a line prints as it scrolls up through the reading line
  useGSAP(
    () => {
      if (!coarse) return;
      ScrollTrigger.create({ trigger: li.current, start: "top 70%", once: true, onEnter: () => type() });
    },
    { scope: li, dependencies: [coarse] },
  );

  const meta = (
    <>
      <time dateTime={note.date}>{dot(note.date)}</time>
      <span aria-hidden> · </span>
      <span data-garble={`#${note.tag}`}>#{note.tag}</span>
    </>
  );
  // the row's name (and so the heading's) is title first: the margin and tags are read once, as words
  const inner = (
    <>
      <span aria-hidden className="font-mono text-label tabular-nums leading-none text-fg-muted">
        <span className="text-signal">{pad(index + 1)}</span>
        <time dateTime={note.date} className="mt-2 hidden md:block">
          {dot(note.date)}
        </time>
      </span>
      <span className="tk-note-head min-w-0 pl-5">
        <span aria-hidden className="mb-2 block font-mono text-micro uppercase tracking-[0.14em] text-fg-muted md:hidden">
          {meta}
        </span>
        <span
          data-garble={note.title}
          className="block font-display text-[clamp(1.35rem,0.95rem+1.5vw,2.35rem)] font-[720] leading-[1.02] tracking-[-0.025em]"
        >
          {note.title}
        </span>
        <span className="sr-only">{`, ${spoken(note.date)}, tagged ${note.tag}`}</span>
      </span>
      <span aria-hidden className="flex items-center gap-4 self-start pl-3">
        <span data-garble={`#${note.tag}`} className="hidden font-mono text-micro uppercase tracking-[0.14em] text-fg-muted md:inline">
          #{note.tag}
        </span>
        <span aria-hidden className="tk-note-sign rounded-full border border-line">
          <Plus size={18} strokeWidth={1.75} />
        </span>
      </span>
    </>
  );

  return (
    <li ref={li} className="tk-note" data-open={open}>
      <h3>
        <button
          type="button"
          className="tk-note-row"
          aria-expanded={open}
          aria-controls={bodyId}
          data-cursor="hover"
          data-cursor-label={open ? "CLOSE" : "READ"}
          onPointerEnter={() => {
            play("tick");
            type();
          }}
          onFocus={(e) => e.currentTarget.matches(":focus-visible") && type()}
          onClick={() => {
            type();
            play(open ? "close" : "open");
            onToggle();
          }}
        >
          {inner}
        </button>
      </h3>

      <p aria-hidden className="tk-note-sub min-h-[2.4rem] pb-4 pt-1 font-mono text-[0.8125rem] leading-snug text-fg-muted md:text-label">
        <span ref={out} />
        <span className="tk-caret" />
      </p>
      <div id={bodyId} role="region" aria-label={note.title} className="tk-fold" inert={!open}>
        <div className="min-h-0 overflow-hidden">
          <div className="tk-note-sub grid max-w-[46rem] gap-4 pb-10 pt-1">
            <p className="sr-only">{note.preview}</p>
            {note.body.map((para) => (
              <p key={para.slice(0, 24)} className="text-lede leading-[1.45]">
                {para}
              </p>
            ))}
            <p className="mt-2 font-mono text-micro uppercase tracking-[0.14em] text-fg-muted">Filed {meta}</p>
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * FIELD NOTES — a lab notebook in log form: number and date in the margin, the title on the line.
 * Hover or focus a line and its first sentence prints; open it and the fragment unfolds in place.
 * Chaos: the log garbles itself, a line at a time.
 */
export function FieldNotes() {
  const root = useRef<HTMLElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const chaos = useChaos();
  const reduced = useReducedMotion();
  const visible = useOnScreen(root, "0px");
  const { contextSafe } = useGSAP({ scope: root });

  useEffect(() => {
    const el = root.current;
    if (!chaos || reduced || !visible || !el) return;
    const garble = contextSafe(() => {
      const lines = el.querySelectorAll<HTMLElement>("[data-garble]");
      const t = lines[Math.floor(Math.random() * lines.length)];
      if (!t || !t.offsetParent || t.closest("[inert]")) return; // hidden on this layout, or in a closed fold
      gsap.to(t, { duration: 1.1, scrambleText: { text: t.dataset.garble ?? "", chars: GARBLE, speed: 0.7 }, ease: "none", overwrite: true });
    });
    garble();
    const id = window.setInterval(garble, 420);
    return () => window.clearInterval(id);
  }, [chaos, reduced, visible, contextSafe]);

  return (
    <section ref={root} id="notes" data-rail="Notes" aria-labelledby="tk-notes" className="frame scroll-mt-24 pb-[clamp(4rem,10svh,7rem)] pt-[clamp(3rem,8svh,6rem)]">
      <h2 id="tk-notes" data-chaos-type className="tk-h2">
        Field <em>notes.</em>
      </h2>
      <ol className="tk-log mt-[clamp(2rem,5svh,3.5rem)]">
        {notes.map((n, i) => (
          <NoteRow key={n.title} note={n} index={i} open={open === i} onToggle={() => setOpen((o) => (o === i ? null : i))} />
        ))}
      </ol>
    </section>
  );
}
