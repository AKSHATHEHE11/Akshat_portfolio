"use client";
// The week grid with today lit. Tap a slot for its room, walk and attendance; tap a day for its list.
import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { MapPin, X } from "lucide-react";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { buildingOf, dayOf, margin, route, toMin, upNext, walkMin } from "../logic";
import type { Slot } from "../scene";
import type { AppCtx } from "./SidApp";

const TINT = ["#dfe6fb", "#ffefb8", "#d6f0e2", "#fde1d8", "#e7defb", "#d5eef5"];

type Sheet = { kind: "slot"; slot: Slot } | { kind: "day"; day: number } | null;

export function Week({ ctx, onRoute }: { ctx: AppCtx; onRoute: (s: Slot) => void }) {
  const { scene, subjects, now } = ctx;
  const { week, days } = scene;
  const [sheet, setSheet] = useState<Sheet>(null);
  const opener = useRef<HTMLElement | null>(null);
  const head = useRef<HTMLHeadingElement>(null);
  const starts = [...new Set(week.map((s) => s.start))].sort((a, b) => toMin(a) - toMin(b));
  const next = upNext(week, scene.now.day, now)?.slot;
  const tint = (short: string) => TINT[Math.max(0, subjects.findIndex((s) => s.short === short)) % TINT.length];

  useEffect(() => {
    if (sheet) head.current?.focus();
  }, [sheet]);

  const open = (s: Sheet, from: HTMLElement) => {
    play("open");
    opener.current = from;
    setSheet(s);
  };
  const close = () => {
    play("close");
    setSheet(null);
    opener.current?.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    e.preventDefault(); // the world shell's Esc (exit) checks this
    close();
  };

  // rows a two-hour lab covers, so its cell can span them
  const rowsOf = (s: Slot) => starts.filter((t) => toMin(t) >= toMin(s.start) && toMin(t) < toMin(s.end)).length;
  const covered = (d: number, t: string) => week.some((s) => s.day === d && toMin(s.start) < toMin(t) && toMin(t) < toMin(s.end));

  return (
    <div className="sid-screen sid-week-screen">
      <header className="sid-head">
        <div>
          <h3 className="sid-h">Week</h3>
          <p className="sid-sub">{scene.now.week}</p>
        </div>
      </header>

      <table className="sid-week">
        <caption className="sr-only">Timetable, Monday to Saturday. Today is {days[scene.now.day]}.</caption>
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Time</span>
            </th>
            {days.map((d, i) => (
              <th key={d} scope="col" data-today={i === scene.now.day || undefined}>
                <button type="button" onClick={(e) => open({ kind: "day", day: i }, e.currentTarget)} aria-label={`${d}: all classes`} data-cursor="hover">
                  {d}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {starts.map((t) => (
            <tr key={t}>
              <th scope="row">{t}</th>
              {days.map((d, i) => {
                if (covered(i, t)) return null;
                const s = week.find((x) => x.day === i && x.start === t);
                if (!s)
                  return (
                    <td key={d} data-today={i === scene.now.day || undefined}>
                      <span className="sr-only">Free</span>
                    </td>
                  );
                const isNext = s === next;
                return (
                  <td key={d} rowSpan={rowsOf(s)} data-today={i === scene.now.day || undefined}>
                    <button
                      type="button"
                      className={cn("sid-cell", isNext && "is-next", s.kind === "Lab" && "is-lab")}
                      style={{ background: tint(s.subject) }}
                      onClick={(e) => open({ kind: "slot", slot: s }, e.currentTarget)}
                      aria-label={`${d} ${s.start}: ${s.subject} ${s.kind}, ${s.room}${isNext ? ", next" : ""}`}
                      data-cursor="hover"
                    >
                      <b>{s.subject}</b>
                      <small>{s.kind === "Lecture" ? s.room.replace(/^[A-Z]+-/, "") : s.kind === "Tutorial" ? "Tut." : s.kind}</small>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="sid-legend">
        <span className="is-next-key" /> next class · labs span two slots
      </p>

      {sheet && (
        <div className="sid-sheet-wrap" onKeyDown={onKey}>
          <button type="button" className="sid-scrim" aria-label="Close" tabIndex={-1} onClick={close} />
          <div className="sid-sheet" role="dialog" aria-labelledby="sid-sheet-h">
            <button type="button" className="sid-sheet-x" onClick={close} aria-label="Close" data-cursor="hover">
              <X size={18} strokeWidth={2.2} />
            </button>
            {sheet.kind === "slot" ? (
              <SlotSheet ctx={ctx} slot={sheet.slot} headRef={head} onRoute={() => onRoute(sheet.slot)} />
            ) : (
              <>
                <h4 id="sid-sheet-h" ref={head} tabIndex={-1} className="sid-sheet-h">
                  {days[sheet.day]}
                </h4>
                <ul className="sid-list">
                  {dayOf(week, sheet.day).map((s) => (
                    <li key={s.start}>
                      <button type="button" className="sid-row" onClick={() => setSheet({ kind: "slot", slot: s })} data-cursor="hover">
                        <span className="sid-row-time">{s.start}</span>
                        <span className="sid-row-main">
                          <b>{s.subject}</b> {s.kind}
                        </span>
                        <span className="sid-row-room">{s.room}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {!dayOf(week, sheet.day).length && <p className="sid-sub">No classes.</p>}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SlotSheet({ ctx, slot, headRef, onRoute }: { ctx: AppCtx; slot: Slot; headRef: RefObject<HTMLHeadingElement | null>; onRoute: () => void }) {
  const { scene, subjects } = ctx;
  const { campus, days } = scene;
  const subject = subjects.find((s) => s.short === slot.subject);
  const b = campus.buildings.find((x) => x.id === buildingOf(slot.room));
  const walk = b ? route(campus, campus.you.node, b.door) : null;
  const m = subject ? margin(subject, scene.minAttendance) : null;
  return (
    <>
      <h4 id="sid-sheet-h" ref={headRef} tabIndex={-1} className="sid-sheet-h">
        {slot.subject} · {slot.kind}
      </h4>
      <p className="sid-sheet-name">{subject?.name}</p>
      <dl className="sid-facts">
        <div>
          <dt>When</dt>
          <dd>
            {days[slot.day]} {slot.start}–{slot.end}
          </dd>
        </div>
        <div>
          <dt>Where</dt>
          <dd>
            {slot.room} · {b?.name}
            {walk && ` · ${walkMin(walk.metres, campus.walk)} min walk`}
          </dd>
        </div>
        <div>
          <dt>Who</dt>
          <dd>{subject?.faculty}</dd>
        </div>
        {m !== null && (
          <div>
            <dt>Misses</dt>
            <dd className={m <= 0 ? "sid-bad" : undefined}>{m < 0 ? `short by ${-m}` : m === 0 ? "none left" : `${m} left`}</dd>
          </div>
        )}
      </dl>
      <button type="button" className="sid-btn sid-btn-wide" onClick={onRoute} data-cursor="hover">
        <MapPin size={15} strokeWidth={2.2} aria-hidden /> Show the walk on Today
      </button>
    </>
  );
}
