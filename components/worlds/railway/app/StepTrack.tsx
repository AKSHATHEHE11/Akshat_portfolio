"use client";
import type { CSSProperties, Ref } from "react";
import { Check, FastForward, RotateCcw } from "lucide-react";
import { pad } from "@/lib/utils";
import { fmt, type Trip } from "../rail";
import type { Station } from "../scene";
import type { Order, Phase } from "./SafarApp";

export default function StepTrack({
  order,
  now,
  phase,
  trip,
  p,
  fast,
  onFast,
  onCancel,
  onNext,
  onReset,
  nextHalt,
  focusRef,
}: {
  order: Order;
  now: number;
  phase: Phase;
  trip: Trip;
  p: number;
  fast: boolean;
  onFast: () => void;
  onCancel: () => void;
  onNext: () => void;
  onReset: () => void;
  nextHalt: Station | null;
  focusRef: Ref<HTMLHeadingElement>;
}) {
  const s = order.station;
  const rem = Math.max(0, order.eta - now);
  const head =
    phase === "delivered"
      ? `Delivered to ${trip.coach} · ${trip.seat}`
      : phase === "handover"
        ? `Handing over at ${trip.coach}`
        : phase === "arriving"
          ? `Pulling into PF ${s.pf}`
          : "Your meal is on the way!";
  const stages = [
    { label: `Order ${order.id} confirmed`, done: true },
    { label: `Cooking at ${order.lines[0]?.dish.kitchen ?? s.en}`, done: p >= 0.12 },
    { label: "Packed, sealed, on the way to the station", done: p >= 0.5 },
    { label: `${s.partner ?? "Partner"} waiting at the ${trip.coach} mark on PF ${s.pf}`, done: p >= 0.72 || phase !== "moving" },
    { label: `Handed over at ${trip.coach} · ${trip.seat}`, done: phase === "delivered" },
  ];
  const current = stages.findIndex((x) => !x.done);

  return (
    <div className="rw-step">
      <h3 ref={focusRef} tabIndex={-1} className="rw-step-h" data-delivered={phase === "delivered" ? "1" : undefined}>
        {head}
      </h3>
      {phase === "delivered" ? (
        <p className="rw-step-p">
          {s.en} · {fmt(order.eta)} · ₹{order.total} paid on the platform.{" "}
          {order.lines.map((l) => `${l.qty} × ${l.dish.name}`).join(", ")}.
        </p>
      ) : (
        <p className="rw-eta">
          <span className="rw-eta-num">
            {pad(Math.floor(rem))}:{pad(Math.floor((rem % 1) * 60))}
          </span>
          <span>
            to {s.en}
            <small>
              train time {fmt(now)} · due {fmt(order.eta)}
            </small>
          </span>
        </p>
      )}

      <ol className="rw-stages">
        {stages.map((x, i) => (
          <li key={i} data-state={x.done ? "done" : i === current ? "now" : "todo"}>
            {x.done && <Check size={10} strokeWidth={4} aria-hidden />}
            {x.label}
          </li>
        ))}
      </ol>

      <div className="rw-track-actions">
        {phase === "moving" && (
          <>
            <button type="button" className="rw-btn rw-btn-ghost" aria-pressed={fast} onClick={onFast} data-cursor="hover">
              <FastForward size={15} aria-hidden /> {fast ? "Real speed" : "Skip ahead"}
            </button>
            <button type="button" className="rw-link hit" onClick={onCancel} data-cursor="hover">
              Cancel order
            </button>
          </>
        )}
        {phase === "delivered" && (
          <>
            {nextHalt && (
              <button type="button" className="rw-btn" onClick={onNext} data-cursor="hover">
                Order at {nextHalt.en}
              </button>
            )}
            <button type="button" className="rw-link hit" onClick={onReset} data-cursor="hover">
              <RotateCcw size={13} aria-hidden /> New PNR
            </button>
          </>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {head}
      </p>
    </div>
  );
}

export function TrackAside({ order, phase, p, trip, consist }: { order: Order; phase: Phase; p: number; trip: Trip; consist: string[] }) {
  const s = order.station;
  const initials = (s.partner ?? "SZ")
    .split(" ")
    .map((w) => w[0])
    .join("");
  return (
    <div className="rw-trackaside">
      <PlatformDiagram consist={consist} coach={trip.coach} station={s} phase={phase} p={p} />
      <div className="rw-card rw-card-dark rw-partner">
        <span className="rw-partner-avatar" aria-hidden>
          {initials}
        </span>
        <span>
          <b>{s.partner}</b>
          <small>Delivery partner · PF {s.pf}</small>
        </span>
        <span className="rw-partner-badge">{phase === "delivered" ? "Paid" : `₹${order.total} due`}</span>
      </div>
    </div>
  );
}

/** Top-down platform: the coach-position board, the partner walking to the right mark, the train rolling in. */
function PlatformDiagram({ consist, coach, station, phase, p }: { consist: string[]; coach: string; station: Station; phase: Phase; p: number }) {
  const idx = Math.max(0, consist.indexOf(coach));
  const cx = ((idx + 0.5) / consist.length) * 100;
  const arrived = phase === "arriving" || phase === "handover" || phase === "delivered";
  const waiting = p >= 0.72 || arrived;
  const label = arrived
    ? `Train at platform ${station.pf}; coach ${coach} is position ${idx + 1}.`
    : waiting
      ? `Partner waiting at the ${coach} mark on platform ${station.pf}.`
      : `Partner on the way to platform ${station.pf}.`;
  return (
    <div className="rw-card rw-card-dark rw-pfd" role="img" aria-label={label} style={{ "--n": consist.length } as CSSProperties}>
      <p className="rw-card-k">
        <span>PF {station.pf}</span>
        <span>{station.en}</span>
      </p>
      <div className="rw-pfd-board" aria-hidden>
        {consist.map((c, i) => (
          <span key={i} data-on={i === idx ? "1" : undefined}>
            {c === "LOCO" ? "ENG" : c}
          </span>
        ))}
      </div>
      <div className="rw-pfd-deck" aria-hidden>
        <span className="rw-pfd-stall rw-hi">चाय</span>
        <span className="rw-pfd-partner" data-state={phase} style={{ left: `${waiting ? cx : 6}%` }} />
      </div>
      <div className="rw-pfd-track" aria-hidden>
        <div className="rw-pfd-train" data-in={arrived ? "1" : undefined}>
          {consist.map((c, i) => (
            <span key={i} data-loco={c === "LOCO" ? "1" : undefined} data-on={i === idx ? "1" : undefined} />
          ))}
        </div>
      </div>
    </div>
  );
}
