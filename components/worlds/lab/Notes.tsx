"use client";
// Process as patch notes. Every firmware still runs: RUN loads that version over your patch (what the
// field could do back then — v0.1 is grey, unwarped, no trails) and the field behind the notes changes.
// RUN again, or BACK, returns your own patch.
import { useEffect, useRef, useSyncExternalStore } from "react";
import { useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import type { ProcessStep } from "@/lib/types";
import { useFieldHost } from "./FieldHost";
import type { PatchNote } from "./scene";

export function Notes({ steps, notes }: { steps: ProcessStep[]; notes: PatchNote[] }) {
  const { field, scrim } = useFieldHost();
  const ui = useSyncExternalStore(field.subscribe, field.getUi, field.getUi);
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);

  // dim the field while the notes are being read (crossing the middle of the screen)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? scrim("notes") : scrim("none", ["notes"])), {
      rootMargin: "-50% 0px -50% 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [scrim]);

  const run = (i: number, n: PatchNote) => {
    if (ui.build === i) {
      play("toggle-off");
      field.restore(!reduced);
    } else {
      play("press");
      field.build(i, n.build, n.version, !reduced);
    }
  };

  return (
    <section ref={ref} id="process" aria-labelledby="nf-notes-h" className="frame relative scroll-mt-24 py-24 md:py-36">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <h2 id="nf-notes-h" data-chaos-type className="nf-h2 nf-h2-narrow">
          Patch notes
        </h2>
        <p className="nf-shade max-w-[32ch] pb-1 text-[1.0625rem] leading-snug text-(--fg)/80">
          Every firmware still runs. Load one over your patch and watch the field forget what it learned since.
        </p>
      </div>

      <ol className="nf-notes mt-10 md:mt-16 lg:ml-auto lg:w-[min(100%,62rem)]">
        {steps.map((s, i) => {
          const n = notes[i];
          const on = !!n && ui.build === i;
          return (
            <li key={s.title} className="nf-note" data-on={on || undefined}>
              <p className="nf-note-ver">
                <b>{n ? `v${n.version}` : `#${i + 1}`}</b>
                {n && <time dateTime={n.date}>{n.date}</time>}
              </p>
              <div className="min-w-0">
                <h3 className="nf-note-title">{s.title}</h3>
                <p className="mt-2 max-w-[46ch] text-(--fg)/80">{s.body}</p>
              </div>
              {n && (
                <ul className="nf-note-changes" aria-label={`Changes in v${n.version}`}>
                  {n.changes.map((c) => (
                    <li key={c} data-sign={c.charAt(0)}>
                      {c}
                    </li>
                  ))}
                </ul>
              )}
              {n && (
                <button
                  type="button"
                  className="nf-run"
                  aria-pressed={on}
                  aria-label={on ? `Running v${n.version}. Press to return to your patch` : `Run firmware v${n.version} over your patch`}
                  data-cursor="hover"
                  onPointerEnter={() => play("tick")}
                  onClick={() => run(i, n)}
                >
                  <span aria-hidden className="nf-led" data-on={on || undefined} />
                  {on ? "Back to mine" : `Run v${n.version}`}
                </button>
              )}
            </li>
          );
        })}
      </ol>
      <p className="sr-only" aria-live="polite">
        {ui.build !== null ? `Field running firmware ${ui.slot.name}` : ""}
      </p>
    </section>
  );
}
