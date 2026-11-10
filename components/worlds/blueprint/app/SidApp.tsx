"use client";
// The SID student app, working: today + the walk to the next room, attendance as misses left,
// the week, the ID (works offline), grades and fees. Local state only; the clock starts at the
// scene's "now" and runs in real time.
import "./app.css";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { BatteryMedium, CalendarDays, GraduationCap, House, IdCard, Plane, Signal, UserCheck, Wifi } from "lucide-react";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { fmt, miss, toMin } from "../logic";
import type { AppTab, BlueprintScene, Fee, Slot, Subject } from "../scene";
import { Attendance } from "./Attendance";
import { IdScreen } from "./IdScreen";
import { Records } from "./Records";
import { Today } from "./Today";
import { Week } from "./Week";

export const TABS: { id: AppTab; label: string; icon: typeof House }[] = [
  { id: "today", label: "Today", icon: House },
  { id: "attendance", label: "Attendance", icon: UserCheck },
  { id: "week", label: "Week", icon: CalendarDays },
  { id: "id", label: "ID", icon: IdCard },
  { id: "records", label: "Records", icon: GraduationCap },
];

export interface Snack {
  text: string;
  tone?: "warn" | "danger" | "ok";
  undo?: () => void;
}

/** What every screen can reach. */
export interface AppCtx {
  scene: BlueprintScene;
  now: number;
  subjects: Subject[];
  offline: boolean;
  go: (tab: AppTab) => void;
  toast: (s: Snack) => void;
}

/** Simulated clock: starts at the scene's time and follows the real one. */
function useClock(start: number) {
  const [now, setNow] = useState(start);
  useEffect(() => {
    const t0 = performance.now();
    const id = window.setInterval(() => setNow(start + Math.floor((performance.now() - t0) / 60000)), 5000);
    return () => window.clearInterval(id);
  }, [start]);
  return now;
}

export default function SidApp({ scene, tab, onTab }: { scene: BlueprintScene; tab: AppTab; onTab: (t: AppTab) => void }) {
  const now = useClock(toMin(scene.now.time));
  const [subjects, setSubjects] = useState(scene.subjects);
  const [focus, setFocus] = useState<string | null>(null);
  const [pick, setPick] = useState<Slot | null>(null);
  const [offline, setOffline] = useState(false);
  const [fees, setFees] = useState<Fee[]>(scene.fees);
  const [snack, setSnack] = useState<(Snack & { n: number }) | null>(null);
  const body = useRef<HTMLDivElement>(null);
  const snackTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(snackTimer.current), []);

  const toast = useCallback((s: Snack) => {
    window.clearTimeout(snackTimer.current);
    setSnack((p) => ({ ...s, n: (p?.n ?? 0) + 1 }));
    snackTimer.current = window.setTimeout(() => setSnack(null), s.undo ? 5200 : 3200);
  }, []);

  const go = useCallback(
    (t: AppTab) => {
      if (t !== tab) play("click");
      onTab(t);
    },
    [onTab, tab],
  );

  // a new screen opens at its top
  useEffect(() => {
    if (body.current) body.current.scrollTop = 0;
  }, [tab]);

  /** +1: one more class marked missed. −1: take one back (never below the synced record). */
  const shift = (short: string, d: 1 | -1) =>
    setSubjects((list) =>
      list.map((s) => {
        if (s.short !== short) return s;
        if (d > 0) return miss(s);
        const synced = scene.subjects.find((o) => o.short === short)?.held ?? s.held;
        return { ...s, held: Math.max(synced, s.held - 1) };
      }),
    );

  const ctx: AppCtx = { scene, now, subjects, offline, go, toast };

  let screen: ReactNode;
  switch (tab) {
    case "today":
      screen = <Today ctx={ctx} pick={pick} setPick={setPick} onFocus={(s) => (setFocus(s), go("attendance"))} />;
      break;
    case "attendance":
      screen = <Attendance ctx={ctx} focus={focus} setFocus={setFocus} onShift={shift} onReset={() => setSubjects(scene.subjects)} />;
      break;
    case "week":
      screen = (
        <Week
          ctx={ctx}
          onRoute={(slot) => {
            setPick(slot);
            go("today");
          }}
        />
      );
      break;
    case "id":
      screen = <IdScreen ctx={ctx} setOffline={setOffline} />;
      break;
    case "records":
      screen = <Records ctx={ctx} fees={fees} setFees={setFees} />;
      break;
  }

  return (
    <div className={cn("sid", offline && "sid-off")} data-lenis-prevent>
      <div className="sid-status" aria-hidden>
        <span className="sid-time">{fmt(now).replace(/^0/, "")}</span>
        <span className="sid-island" />
        <span className="sid-icons">
          {offline ? (
            <Plane size={13} strokeWidth={2.4} />
          ) : (
            <>
              <Signal size={13} strokeWidth={2.4} />
              <Wifi size={13} strokeWidth={2.4} />
            </>
          )}
          <BatteryMedium size={17} strokeWidth={2} />
        </span>
      </div>

      <div ref={body} className="sid-body" data-lenis-prevent>
        {screen}
      </div>

      {snack && (
        <div key={snack.n} className={cn("sid-snack", snack.tone && `sid-snack-${snack.tone}`)} role="status">
          <span>{snack.text}</span>
          {snack.undo && (
            <button
              type="button"
              className="sid-snack-undo"
              onClick={() => {
                snack.undo?.();
                setSnack(null);
                play("toggle-off");
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}

      <nav className="sid-tabs" aria-label="App">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className="sid-tab"
            aria-current={tab === id ? "page" : undefined}
            onClick={() => go(id)}
            data-cursor="hover"
          >
            <Icon size={19} strokeWidth={tab === id ? 2.3 : 1.8} aria-hidden />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
