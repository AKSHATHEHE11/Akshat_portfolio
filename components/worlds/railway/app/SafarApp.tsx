"use client";
import "./app.css";
import { memo, useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Copy, TrainFront } from "lucide-react";
import { BEZIER } from "@/lib/motion";
import { play } from "@/lib/sound";
import { emit } from "@/lib/system";
import { clamp } from "@/lib/utils";
import type { Drive } from "../Landscape";
import { RouteLine } from "../RouteLine";
import { dayT, fmt, haltOf, kmAt, reach, readPnr, toMin, type Trip } from "../rail";
import type { Dish, RailwayScene, Station } from "../scene";
import StepMenu, { Cart } from "./StepMenu";
import StepPnr, { TicketHelp } from "./StepPnr";
import StepStation, { LiveStatus } from "./StepStation";
import StepTrack, { TrackAside } from "./StepTrack";

export type Phase = "idle" | "moving" | "arriving" | "handover" | "delivered";
export interface Order {
  id: string;
  station: Station;
  lines: { dish: Dish; qty: number }[];
  total: number;
  from: number;
  eta: number;
}
type Step = "pnr" | "station" | "menu" | "track";
const STEPS: { id: Step; label: string }[] = [
  { id: "pnr", label: "PNR" },
  { id: "station", label: "Halt" },
  { id: "menu", label: "Menu" },
  { id: "track", label: "Track" },
];

/**
 * The product, working: PNR → train/coach/berth → a reachable halt → that station's menu → cart →
 * order → live tracking until the partner hands it over at the coach door. All local state; the
 * clock is simulated (compressed while tracking) and drives the sky outside the window.
 */
// memo: the order window re-renders as it scrolls in and out of view; the app has nothing to redo
export default memo(function SafarApp({
  brand,
  scene,
  driveRef,
  onArrive,
  onDepart,
  onDelivered,
}: {
  brand: string;
  scene: RailwayScene;
  driveRef: RefObject<Drive>;
  onArrive: (station: Station, coach: string) => void;
  onDepart: () => void;
  onDelivered: (code: string) => void;
}) {
  const late = scene.train.lateMin;
  const [step, setStep] = useState<Step>("pnr");
  const [pnr, setPnr] = useState(scene.pnr);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [station, setStation] = useState<Station | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [order, setOrder] = useState<Order | null>(null);
  const [sim, setSim] = useState({ now: toMin(scene.now), phase: "idle" as Phase });
  const [fast, setFast] = useState(false);
  const moved = useRef(false);
  const timer = useRef(0);
  const sheetEl = useRef<HTMLElement>(null);
  const bodyEl = useRef<HTMLDivElement>(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  /** leave a platform the train is parked at (after a delivery) before anything new happens */
  const depart = () => {
    if (driveRef.current.stopAt != null) onDepart();
  };

  const go = (s: Step) => {
    moved.current = true;
    setStep(s);
  };
  // a new step opens at its top (the sheet, or the whole body on phones, keeps the last step's
  // scroll otherwise); after a visitor's step change, focus its heading (keyboard + screen readers)
  const focusRef = useCallback((el: HTMLHeadingElement | null) => {
    if (!el) return;
    if (sheetEl.current) sheetEl.current.scrollTop = 0;
    if (bodyEl.current) bodyEl.current.scrollTop = 0;
    if (moved.current) el.focus({ preventScroll: true });
  }, []);

  // the sky outside follows the simulated clock
  useEffect(() => {
    driveRef.current.t = dayT(scene.route, sim.now);
  }, [sim.now, driveRef, scene.route]);

  // live tracking: compressed clock; brake onto the platform near the end; hand over once stopped
  const running = !!order && (sim.phase === "moving" || sim.phase === "arriving");
  useEffect(() => {
    if (!running || !order) return;
    const span = order.eta - order.from;
    const perTick = span / clamp(span * 0.5, 16, 38) / 10;
    const id = window.setInterval(() => {
      const stopped = driveRef.current.speed < 0.01;
      setSim((s) => {
        if (s.phase !== "moving" && s.phase !== "arriving") return s;
        const now = Math.min(order.eta, s.now + perTick * (fast ? 6 : 1));
        const p = (now - order.from) / span;
        if (s.phase === "moving" && p >= 0.86) return { now, phase: "arriving" };
        if (s.phase === "arriving" && now >= order.eta && stopped) return { now, phase: "handover" };
        return { now, phase: s.phase };
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [running, order, fast, driveRef]);

  useEffect(() => {
    if (!order || !trip) return;
    if (sim.phase === "arriving") onArrive(order.station, trip.coach);
    if (sim.phase === "handover") {
      const id = window.setTimeout(() => setSim((s) => ({ ...s, phase: "delivered" })), 1800);
      return () => window.clearTimeout(id);
    }
    if (sim.phase === "delivered") {
      play("success");
      onDelivered(order.station.code);
    }
  }, [sim.phase, order, trip, onArrive, onDelivered]);

  const editPnr = (v: string) => {
    const next = v.replace(/\D/g, "").slice(0, 10);
    if (next !== pnr) play("type");
    setPnr(next);
    setError("");
  };

  const submitPnr = () => {
    if (loading) return; // Enter in the field still submits while the button is disabled
    if (!/^\d{10}$/.test(pnr)) {
      setError(pnr.length ? `That's ${pnr.length} digit${pnr.length === 1 ? "" : "s"}. A PNR has 10.` : "Type the 10-digit PNR from your ticket.");
      play("error");
      return;
    }
    play("click");
    setLoading(true);
    timer.current = window.setTimeout(() => {
      setLoading(false);
      depart();
      setOrder(null);
      setTrip(readPnr(pnr, scene.train.consist));
      setSim({ now: toMin(scene.now), phase: "idle" });
      setStation(null);
      setCart({});
      play("open");
      go("station");
    }, 900);
  };

  const pick = (s: Station) => {
    play("click");
    if (s.code !== station?.code) setCart({});
    setStation(s);
    go("menu");
  };

  const add = (d: Dish) => {
    play("tick");
    setCart((c) => ({ ...c, [d.id]: Math.min(9, (c[d.id] ?? 0) + 1) }));
  };
  const dec = (d: Dish) => {
    play("tick");
    setCart((c) => {
      const n = (c[d.id] ?? 0) - 1;
      const next = { ...c };
      if (n > 0) next[d.id] = n;
      else delete next[d.id];
      return next;
    });
  };

  const lines = (station?.menu ?? []).filter((d) => cart[d.id]).map((dish) => ({ dish, qty: cart[dish.id] }));
  const subtotal = lines.reduce((a, l) => a + l.dish.price * l.qty, 0);

  const place = () => {
    if (!station || !lines.length) return;
    const r = reach(station, sim.now, late, scene.leadMin);
    if (!r.ok) return;
    play("press");
    depart();
    setOrder({
      id: `SZ-${station.code}-${pnr.slice(-4)}`,
      station,
      lines,
      total: subtotal + scene.deliveryFee,
      from: sim.now,
      eta: r.eta,
    });
    setFast(false);
    setSim((s) => ({ ...s, phase: "moving" }));
    go("track");
  };

  const cancel = () => {
    play("close");
    setOrder(null);
    setSim((s) => ({ ...s, phase: "idle" }));
    go("menu");
  };

  const departed = order ? order.eta + haltOf(order.station) : sim.now;
  const nextHalt = order && sim.phase === "delivered" ? scene.route.find((s) => reach(s, departed, late, scene.leadMin).ok) ?? null : null;

  const another = () => {
    play("click");
    depart();
    setSim({ now: departed, phase: "idle" });
    setOrder(null);
    setCart({});
    setStation(null);
    go("station");
  };

  const reset = () => {
    play("click");
    depart();
    setOrder(null);
    setTrip(null);
    setStation(null);
    setCart({});
    setSim({ now: toMin(scene.now), phase: "idle" });
    go("pnr");
  };

  const copyPnr = () => {
    play("click");
    void navigator.clipboard?.writeText(pnr).then(
      () => emit("toast", { text: `PNR ${pnr} copied` }),
      () => undefined,
    );
  };

  const busy = sim.phase === "moving" || sim.phase === "arriving" || sim.phase === "handover";
  const can = (s: Step) =>
    busy ? s === "track" : s === "pnr" || (s === "station" && !!trip) || (s === "menu" && !!station) || (s === "track" && !!order);
  const p = order ? clamp((sim.now - order.from) / (order.eta - order.from)) : 0;

  // what is actually on screen (a step can't show before its data exists)
  let view: Step;
  let body: ReactNode;
  let aside: ReactNode;
  let mobileBar: ReactNode = null;
  if (step === "pnr" || !trip) {
    view = "pnr";
    body = <StepPnr pnr={pnr} onChange={editPnr} onSubmit={submitPnr} loading={loading} error={error} focusRef={focusRef} />;
    aside = <TicketHelp pnr={pnr} scene={scene} />;
  } else if (step === "station" || !station) {
    view = "station";
    body = <StepStation scene={scene} trip={trip} now={sim.now} selected={station?.code ?? null} onPick={pick} onReset={reset} focusRef={focusRef} />;
    aside = <LiveStatus scene={scene} now={sim.now} />;
  } else if (step === "menu" || !order) {
    view = "menu";
    const r = reach(station, sim.now, late, scene.leadMin);
    body = (
      <StepMenu station={station} reach={r} cart={cart} onAdd={add} onDec={dec} onBack={() => go("station")} focusRef={focusRef} />
    );
    aside = <Cart station={station} trip={trip} lines={lines} fee={scene.deliveryFee} closed={!r.ok ? r.why : null} onPlace={place} />;
    // phones: the cart sits below the menu, so keep the total and the order button in reach
    if (lines.length && r.ok)
      mobileBar = (
        <div className="rw-mbar">
          <span>
            <b>₹{subtotal + scene.deliveryFee}</b> · {lines.reduce((a, l) => a + l.qty, 0)} in the tiffin
          </span>
          <button type="button" className="rw-btn" onClick={place} data-cursor="hover">
            Place order
          </button>
        </div>
      );
  } else {
    view = "track";
    body = (
      <StepTrack
        order={order}
        now={sim.now}
        phase={sim.phase}
        trip={trip}
        p={p}
        fast={fast}
        onFast={() => {
          play(fast ? "toggle-off" : "toggle-on");
          setFast(!fast);
        }}
        onCancel={cancel}
        onNext={another}
        onReset={reset}
        nextHalt={nextHalt}
        focusRef={focusRef}
      />
    );
    aside = <TrackAside order={order} phase={sim.phase} p={p} trip={trip} consist={scene.train.consist} />;
  }

  return (
    <div className="rw-app">
      <header className="rw-app-bar">
        <span className="rw-app-logo">
          <TrainFront size={18} strokeWidth={2.2} aria-hidden />
          {brand}
        </span>
        <ol className="rw-app-steps" aria-label="Order steps">
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                className="hit"
                disabled={!can(s.id)}
                aria-current={view === s.id ? "step" : undefined}
                aria-label={s.label}
                onClick={() => {
                  play("click");
                  go(s.id);
                }}
                data-cursor="hover"
              >
                <i>{i + 1}</i>
                <span>{s.label}</span>
              </button>
            </li>
          ))}
        </ol>
        <span className="rw-app-meta">
          <span className="rw-app-clock" title="Train time">
            {fmt(sim.now)}
          </span>
          {trip && (
            <button type="button" className="rw-app-pnr hit" onClick={copyPnr} aria-label={`Copy PNR ${pnr}`} data-cursor="hover">
              PNR {pnr} <Copy size={12} aria-hidden />
            </button>
          )}
        </span>
      </header>

      <div ref={bodyEl} className="rw-app-body" data-lenis-prevent>
        <section ref={sheetEl} className="rw-sheet" aria-label="Order" data-lenis-prevent>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              initial={{ opacity: 0, x: 22 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -14 }}
              transition={{ duration: 0.26, ease: BEZIER.out }}
            >
              {body}
            </motion.div>
          </AnimatePresence>
        </section>
        <aside className="rw-aside" aria-label="Trip details" data-lenis-prevent>
          {aside}
        </aside>
        {mobileBar}
      </div>

      <RouteLine route={scene.route} km={kmAt(scene.route, sim.now, late)} highlight={order?.station.code ?? station?.code ?? null} className="rw-route-app" />
    </div>
  );
});
