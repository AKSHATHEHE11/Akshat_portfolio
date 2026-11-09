"use client";
import { useId, type Ref } from "react";
import { ArrowRight } from "lucide-react";
import type { RailwayScene } from "../scene";

export default function StepPnr({
  pnr,
  onChange,
  onSubmit,
  loading,
  error,
  focusRef,
}: {
  pnr: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string;
  focusRef: Ref<HTMLHeadingElement>;
}) {
  const id = useId();
  return (
    <form
      className="rw-step"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <h3 ref={focusRef} tabIndex={-1} className="rw-step-h">
        Where are you sitting?
      </h3>
      <p className="rw-step-p">Your ticket already knows. Enter the PNR and the coach, berth and route come with it — no sign-up.</p>
      <label htmlFor={id} className="rw-field-label">
        PNR number
      </label>
      <div className="rw-pnr">
        <input
          id={id}
          value={pnr}
          onChange={(e) => onChange(e.target.value)}
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={!!error}
          aria-describedby={`${id}-err ${id}-hint`}
          data-cursor="text"
        />
        <span className="rw-pnr-count" aria-hidden>
          {pnr.length}/10
        </span>
      </div>
      <p id={`${id}-err`} className="rw-err" role="alert">
        {error}
      </p>
      <button type="submit" className="rw-btn" disabled={loading} data-cursor="hover">
        {loading ? "Reading the chart…" : "Find my train"}
        {!loading && <ArrowRight size={16} strokeWidth={2.4} aria-hidden />}
      </button>
      {loading && <span className="rw-loadbar" aria-hidden />}
      <p id={`${id}-hint`} className="rw-step-note">
        Demo: any 10 digits work. Coach and berth are worked out from the number.
      </p>
    </form>
  );
}

/** Where the PNR lives on a ticket — mirrors what you type, live. */
export function TicketHelp({ pnr, scene }: { pnr: string; scene: RailwayScene }) {
  const from = scene.route[0];
  const to = scene.route[scene.route.length - 1];
  return (
    <div className="rw-card rw-card-dark rw-eticket">
      <p className="rw-card-k">E-ticket · found in your SMS</p>
      <dl>
        <div className="rw-eticket-pnr">
          <dt>PNR</dt>
          <dd>{pnr.padEnd(10, "·")}</dd>
        </div>
        <div>
          <dt>Train</dt>
          <dd>
            {scene.train.no} / {scene.train.name}
          </dd>
        </div>
        <div>
          <dt>From</dt>
          <dd>
            {from.code} {from.dep}
          </dd>
        </div>
        <div>
          <dt>To</dt>
          <dd>
            {to.code} {to.arr}
          </dd>
        </div>
        <div>
          <dt>Berth</dt>
          <dd>CNF / — / —</dd>
        </div>
      </dl>
      <p className="rw-card-note">Top left of every ticket. That number is the whole login.</p>
    </div>
  );
}
