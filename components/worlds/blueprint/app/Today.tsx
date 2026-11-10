"use client";
// Home: where now? The next class (or any picked one), the walk to its door, the subject closest to
// its attendance limit, and the rest of the day.
import { ChevronRight, Footprints, RotateCcw, TriangleAlert } from "lucide-react";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { buildingOf, dayOf, fmt, margin, risk, route, span, toMin, upNext, walkMin } from "../logic";
import type { Slot } from "../scene";
import { MiniPlan } from "./MiniPlan";
import type { AppCtx } from "./SidApp";

export function Today({ ctx, pick, setPick, onFocus }: { ctx: AppCtx; pick: Slot | null; setPick: (s: Slot | null) => void; onFocus: (short: string) => void }) {
  const { scene, now, subjects } = ctx;
  const { campus, days } = scene;
  const today = dayOf(scene.week, scene.now.day);
  const up = upNext(scene.week, scene.now.day, now);
  const slot = pick ?? up?.slot ?? null;
  const subject = slot ? subjects.find((s) => s.short === slot.subject) : undefined;
  const b = slot ? campus.buildings.find((x) => x.id === buildingOf(slot.room)) : undefined;
  const walk = b ? route(campus, campus.you.node, b.door) : null;
  const mins = walk ? walkMin(walk.metres, campus.walk) : 0;
  const start = slot ? toMin(slot.start) : 0;
  const isToday = slot?.day === scene.now.day;
  const live = isToday && slot && start <= now && now < toMin(slot.end);
  const ahead = isToday && start > now;

  const head = !slot
    ? ""
    : !isToday
      ? `${days[slot.day]} · ${slot.start}`
      : live
        ? `Now · till ${slot.end}`
        : ahead
          ? `${pick ? "Later" : "Next"} · in ${span(start - now)}`
          : "Earlier today";

  const worst = subjects.map((s) => ({ s, m: margin(s, scene.minAttendance) })).sort((a, c) => a.m - c.m)[0];
  const later = today.filter((s) => toMin(s.start) > now && s !== slot);
  const hour = Math.floor(now / 60);

  return (
    <div className="sid-screen">
      <header className="sid-head">
        <div>
          <h3 className="sid-h">
            {hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening"}, {scene.student.first}
          </h3>
          <p className="sid-sub">
            {scene.now.date} · {scene.now.week}
          </p>
        </div>
        <button type="button" className="sid-avatar" onClick={() => ctx.go("id")} aria-label="Open your student ID" data-cursor="hover">
          {scene.student.initials}
        </button>
      </header>

      {slot && subject && b ? (
        <section className="sid-card sid-next" aria-label="Class">
          <div className="sid-next-top">
            <span className={cn("sid-kicker", (live || (ahead && start - now <= 15)) && "sid-kicker-hot")}>{head}</span>
            <span className="sid-badge">{slot.kind}</span>
          </div>
          <p className="sid-next-name">{subject.name}</p>
          <p className="sid-next-meta">
            <b>{slot.room}</b> · {b.name} · {slot.start}–{slot.end}
          </p>
          <p className="sid-next-meta">{subject.faculty}</p>
          <MiniPlan campus={campus} to={b} room={slot.room} />
          {walk && (
            <p className="sid-walk">
              <Footprints size={14} strokeWidth={2} aria-hidden />
              <span>
                {walk.metres} m · {mins} min from {campus.you.label.toLowerCase()}
                {ahead && <> · leave by {fmt(start - mins)}</>}
              </span>
            </p>
          )}
          {pick && (
            <button
              type="button"
              className="sid-textbtn hit"
              data-cursor="hover"
              onClick={() => {
                play("click");
                setPick(null);
              }}
            >
              <RotateCcw size={13} strokeWidth={2.2} aria-hidden /> Back to the next class
            </button>
          )}
        </section>
      ) : (
        <section className="sid-card sid-next">
          <span className="sid-kicker">Done for today</span>
          <p className="sid-next-name">No more classes</p>
          <p className="sid-next-meta">{campus.buildings.filter((x) => x.door === campus.you.node).map((x) => `${x.name} · ${x.use}`)}</p>
        </section>
      )}

      {worst && (
        <button type="button" className={cn("sid-chip", `sid-r-${risk(worst.m)}`)} onClick={() => onFocus(worst.s.short)} data-cursor="hover">
          <TriangleAlert size={15} strokeWidth={2.2} aria-hidden />
          <span>
            <b>{worst.s.short}</b>{" "}
            {worst.m < 0 ? `short by ${-worst.m} — needs condonation` : worst.m === 0 ? "no more misses this semester" : `you can miss ${worst.m} more`}
          </span>
          <ChevronRight size={16} aria-hidden />
        </button>
      )}

      {later.length > 0 && (
        <section aria-label="Later today">
          <h4 className="sid-label">Later today</h4>
          <ul className="sid-list">
            {later.map((s) => (
              <li key={`${s.day}-${s.start}`}>
                <button
                  type="button"
                  className="sid-row"
                  onClick={() => {
                    play("click");
                    setPick(s);
                  }}
                  data-cursor="hover"
                >
                  <span className="sid-row-time">{s.start}</span>
                  <span className="sid-row-main">
                    <b>{s.subject}</b> {s.kind}
                  </span>
                  <span className="sid-row-room">{s.room}</span>
                  <ChevronRight size={15} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
