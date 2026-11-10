"use client";
// Attendance as a budget: every subject gets a number of misses for the semester (drawn as boxes),
// and the big number is how many are left. Mark a class missed to see what it costs.
import { useEffect, useRef } from "react";
import { Minus, Undo2 } from "lucide-react";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { allowance, margin, percent, risk, type Risk } from "../logic";
import type { AppCtx } from "./SidApp";

const SAY: Record<Risk, (m: number) => string> = {
  safe: () => "Comfortable. Nothing to plan around.",
  careful: (m) => `Careful: ${m} left for the rest of the semester.`,
  last: () => "No more misses. The next one takes you under the line.",
  short: (m) => `Short by ${-m}. That needs a condonation form and a medical note.`,
};
const LABEL: Record<Risk, string> = { safe: "safe", careful: "careful", last: "at the limit", short: "short" };

export function Attendance({
  ctx,
  focus,
  setFocus,
  onShift,
  onReset,
}: {
  ctx: AppCtx;
  focus: string | null;
  setFocus: (s: string | null) => void;
  onShift: (short: string, d: 1 | -1) => void;
  onReset: () => void;
}) {
  const { scene, subjects, toast } = ctx;
  const min = scene.minAttendance;
  const rows = useRef(new Map<string, HTMLLIElement>());
  const changed = subjects.some((s, i) => s.held !== scene.subjects[i]?.held);
  const counts = subjects.reduce<Record<Risk, number>>(
    (a, s) => {
      a[risk(margin(s, min))]++;
      return a;
    },
    { safe: 0, careful: 0, last: 0, short: 0 },
  );

  // arriving from the home chip: bring that subject into view inside the phone, not the page
  useEffect(() => {
    const el = focus ? rows.current.get(focus) : null;
    const box = el?.closest(".sid-body");
    if (el && box) box.scrollTop = el.offsetTop - 70;
  }, [focus]);

  const markMissed = (short: string) => {
    const s = subjects.find((x) => x.short === short);
    if (!s) return;
    if (s.held >= s.planned) {
      play("error");
      return toast({ text: `${short}: every planned class is already counted.` });
    }
    const m = margin(s, min) - 1;
    const r = risk(m);
    onShift(short, 1);
    play(r === "short" || r === "last" ? "error" : "press");
    toast({
      text: m < 0 ? `${short} is now short by ${-m}.` : m === 0 ? `${short}: that was the last one.` : `${short} marked missed. ${m} left.`,
      tone: r === "short" ? "danger" : r === "safe" ? "ok" : "warn",
      undo: () => onShift(short, -1),
    });
  };

  return (
    <div className="sid-screen">
      <header className="sid-head">
        <div>
          <h3 className="sid-h">Attendance</h3>
          <p className="sid-sub">
            {Math.round(min * 100)}% by semester end · {scene.student.semester}
          </p>
        </div>
        {changed && (
          <button
            type="button"
            className="sid-textbtn"
            onClick={() => {
              play("toggle-off");
              onReset();
            }}
          >
            <Undo2 size={13} strokeWidth={2.2} aria-hidden /> Reset
          </button>
        )}
      </header>

      <p className="sid-tally" aria-label="Subjects by status">
        {(Object.keys(counts) as Risk[])
          .filter((k) => counts[k])
          .map((k) => (
            <span key={k} className={`sid-r-${k}`}>
              <b>{counts[k]}</b> {LABEL[k]}
            </span>
          ))}
      </p>

      <ul className="sid-att-list">
        {subjects.map((s) => {
          const m = margin(s, min);
          const r = risk(m);
          const allowed = allowance(s, min);
          const missed = s.held - s.attended;
          const open = focus === s.short;
          const extra = s.held - (scene.subjects.find((o) => o.short === s.short)?.held ?? s.held);
          const id = `sid-att-${s.code}`;
          return (
            <li
              key={s.code}
              ref={(el) => {
                if (el) rows.current.set(s.short, el);
                else rows.current.delete(s.short);
              }}
              className={cn("sid-att", `sid-r-${r}`, open && "is-open")}
            >
              <button
                type="button"
                className="sid-att-head"
                aria-expanded={open}
                aria-controls={id}
                onClick={() => {
                  play(open ? "close" : "open");
                  setFocus(open ? null : s.short);
                }}
                data-cursor="hover"
              >
                <span className="sid-att-name">
                  <b>{s.short}</b> {s.name}
                  <small>
                    {s.attended}/{s.held} attended · {percent(s)}% now
                  </small>
                </span>
                <span className="sid-att-m">
                  <b key={m}>{Math.abs(m)}</b>
                  <small>{m < 0 ? "short by" : "can miss"}</small>
                </span>
              </button>
              <span className="sid-boxes" aria-label={`${missed} of ${allowed} misses used`} role="img">
                {Array.from({ length: Math.max(allowed, missed) }, (_, i) => (
                  <i key={i} className={i < missed ? (i < allowed ? "x" : "over") : undefined} />
                ))}
              </span>
              {open && (
                <div id={id} className="sid-att-more">
                  <p>
                    {s.planned} classes planned this semester; you need {s.planned - allowed}. You&apos;ve missed {missed} of the {allowed} you can afford.
                  </p>
                  <p className="sid-att-say">{SAY[r](m)}</p>
                  <div className="sid-actions">
                    <button type="button" className="sid-btn" onClick={() => markMissed(s.short)} data-cursor="hover">
                      <Minus size={15} strokeWidth={2.4} aria-hidden /> Mark one missed
                    </button>
                    {extra > 0 && (
                      <button
                        type="button"
                        className="sid-btn sid-btn-ghost"
                        onClick={() => {
                          play("toggle-off");
                          onShift(s.short, -1);
                        }}
                        data-cursor="hover"
                      >
                        <Undo2 size={14} strokeWidth={2.2} aria-hidden /> Undo
                      </button>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
