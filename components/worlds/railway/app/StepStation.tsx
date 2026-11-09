"use client";
import type { Ref } from "react";
import { arrOf, fmt, haltOf, kmAt, reach, type Trip } from "../rail";
import type { RailwayScene, Station } from "../scene";

const lastPassed = (scene: RailwayScene, now: number) =>
  scene.route.findLastIndex((s) => arrOf(s) + scene.train.lateMin <= now);

export default function StepStation({
  scene,
  trip,
  now,
  selected,
  onPick,
  onReset,
  focusRef,
}: {
  scene: RailwayScene;
  trip: Trip;
  now: number;
  selected: string | null;
  onPick: (s: Station) => void;
  onReset: () => void;
  focusRef: Ref<HTMLHeadingElement>;
}) {
  const late = scene.train.lateMin;
  const rows = scene.route.slice(Math.max(0, lastPassed(scene, now)));
  const open = rows.some((s) => reach(s, now, late, scene.leadMin).ok);
  const from = scene.route[0];
  const to = scene.route[scene.route.length - 1];

  return (
    <div className="rw-step">
      <div className="rw-tripcard">
        <span className="rw-tripcard-stamp" aria-label="Confirmed">
          CNF
        </span>
        <p className="rw-tripcard-train">
          <b>{scene.train.no}</b> {scene.train.name}
        </p>
        <p className="rw-tripcard-seat">
          Coach <b>{trip.coach}</b> · Berth <b>{trip.seat}</b> {trip.berth}
        </p>
        <p className="rw-tripcard-route">
          {from.code} → {to.code} · running {late} min late
        </p>
      </div>

      <h3 ref={focusRef} tabIndex={-1} className="rw-step-h">
        {open ? "Pick a halt" : "End of the line"}
      </h3>
      <p className="rw-step-p">
        {open
          ? `Only kitchens that can reach ${trip.coach} before the train pulls out are listed.`
          : `No halts left before ${to.en}. Start again with a fresh ticket.`}
      </p>

      {open ? (
        <ul className="rw-halts">
          {rows.map((s) => {
            const r = reach(s, now, late, scene.leadMin);
            const halt = haltOf(s);
            return (
              <li key={s.code}>
                <button
                  type="button"
                  className="rw-halt"
                  disabled={!r.ok}
                  aria-current={selected === s.code ? "true" : undefined}
                  onClick={() => onPick(s)}
                  data-cursor="hover"
                >
                  <span className="rw-halt-code">{s.code}</span>
                  <span className="rw-halt-name">
                    {s.en}
                    <span lang="hi" className="rw-hi">
                      {s.hi}
                    </span>
                  </span>
                  <span className="rw-halt-eta">{fmt(r.eta)}</span>
                  <span className="rw-halt-meta">
                    {s.kind === "pass" ? "Runs through" : `PF ${s.pf} · ${halt ? `${halt} min halt` : "terminus"}`}
                    {s.famous && r.ok ? ` · ${s.famous}` : ""}
                  </span>
                  <span className="rw-halt-why" data-ok={r.ok}>
                    {r.why}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <button type="button" className="rw-btn" onClick={onReset} data-cursor="hover">
          New PNR
        </button>
      )}
    </div>
  );
}

/** Live running status (what the PRS feed would say) */
export function LiveStatus({ scene, now }: { scene: RailwayScene; now: number }) {
  const late = scene.train.lateMin;
  const i = lastPassed(scene, now);
  const last = scene.route[Math.max(0, i)];
  const next = scene.route[Math.min(scene.route.length - 1, i + 1)];
  const km = kmAt(scene.route, now, late);
  return (
    <div className="rw-card rw-card-dark rw-live">
      <p className="rw-card-k">
        <span className="rw-live-dot" aria-hidden /> Running status · {fmt(now)}
      </p>
      <dl>
        <div>
          <dt>Train</dt>
          <dd>
            {scene.train.no} {scene.train.name}
          </dd>
        </div>
        <div>
          <dt>Delay</dt>
          <dd>{late} min</dd>
        </div>
        <div>
          <dt>Passed</dt>
          <dd>
            {last.en} · {fmt(arrOf(last) + late)}
          </dd>
        </div>
        <div>
          <dt>Next</dt>
          <dd>
            {next.en} · {fmt(arrOf(next) + late)}
          </dd>
        </div>
        <div>
          <dt>Covered</dt>
          <dd>
            {Math.round(km)} of {scene.route[scene.route.length - 1].km} km
          </dd>
        </div>
      </dl>
    </div>
  );
}
