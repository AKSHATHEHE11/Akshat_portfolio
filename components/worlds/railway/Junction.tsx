"use client";
import { useState } from "react";
import { play } from "@/lib/sound";
import type { Decision } from "@/lib/types";
import { SplitFlap } from "./SplitFlap";

const STATUS_POOL = ["BOARDING", "DELAYED", "ON TIME", "PF CHANGE", "RUNNING"];

/** Decisions as departure boards: pick a platform, see where that train goes and which one actually ran. */
export default function Junction({ decisions }: { decisions: Decision[] }) {
  return (
    <section className="rw-deps" aria-labelledby="rw-deps-h">
      <div className="rw-deps-roof" aria-hidden />
      <div className="frame">
        <h2 id="rw-deps-h" className="rw-sec-h">
          <span data-chaos-type>Departures</span>
          <span lang="hi" className="rw-hi">
            प्रस्थान
          </span>
        </h2>
        <div className="rw-deps-list">
          {decisions.map((d, i) => (
            <Fork key={d.question} d={d} n={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Fork({ d, n }: { d: Decision; n: number }) {
  const [pick, setPick] = useState<number | null>(null);
  return (
    <div className="rw-fork">
      <div className="rw-fork-q">
        <span className="rw-fork-n">{String(n + 1).padStart(2, "0")}</span>
        <h3>{d.question}</h3>
      </div>
      <div className="rw-pfs" role="group" aria-label={d.question}>
        {d.options.map((o, i) => {
          const state = pick == null ? "idle" : i === d.chosen ? "go" : "off";
          const status = state === "idle" ? "BOARDING" : state === "go" ? "DEPARTED" : "CANCELLED";
          const show = pick != null && (i === pick || i === d.chosen);
          return (
            <button
              key={o.label}
              type="button"
              className="rw-pfb"
              data-state={state}
              aria-pressed={pick === i}
              aria-label={`Platform ${i + 1}: ${o.label}`}
              onClick={() => {
                play(i === d.chosen ? "success" : "press");
                setPick(i);
              }}
              data-cursor="hover"
            >
              <span className="rw-pfb-top">
                <span className="rw-pfb-no">{i + 1}</span>
                <span>Platform {i + 1}</span>
                <span lang="hi" className="rw-hi">
                  प्लेटफ़ॉर्म {i + 1}
                </span>
              </span>
              <SplitFlap text={o.label} size={14} className="rw-pfb-dest" pool={d.options.map((x) => x.label)} />
              <SplitFlap text={status} size={9} className="rw-pfb-status" pool={STATUS_POOL} />
              <span className="rw-pfb-note" data-show={show ? "1" : undefined}>
                {o.note}
              </span>
              <span className="rw-pfb-rail" aria-hidden>
                <span className="rw-pfb-train" />
              </span>
            </button>
          );
        })}
      </div>
      <p className="rw-why" aria-live="polite">
        {pick != null && (
          <>
            <b>{pick === d.chosen ? "Same platform I took." : `I took platform ${d.chosen + 1}.`}</b> {d.why}
          </>
        )}
      </p>
    </div>
  );
}
