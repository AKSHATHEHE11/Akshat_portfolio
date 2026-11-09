"use client";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import type { ProcessStep } from "@/lib/types";
import { pad } from "@/lib/utils";
import type { RailwayScene } from "./scene";

const BERTH = ["LB", "MB", "UB", "LB", "MB", "UB", "SL", "SU"];

/** Process, as the reservation chart pasted on the coach door: every step is a passenger, printed
 *  line by line by a dot-matrix printer, RAC turning CNF, then stamped. */
export default function Chart({
  process,
  train,
  year,
  coach,
}: {
  process: ProcessStep[];
  train: RailwayScene["train"];
  year: number;
  coach: string;
}) {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;
      const tl = gsap.timeline({ scrollTrigger: { trigger: ".rw-chart", start: "top 72%", once: true } });
      tl.from(".rw-chart", { y: 90, rotate: -5, opacity: 0, duration: 1.1, ease: "expo.out" });
      gsap.utils.toArray<HTMLElement>(".rw-chart-row").forEach((row, i) => {
        const at = 0.45 + i * 0.32;
        tl.from(row, { clipPath: "inset(0 100% 0 0)", duration: 0.7, ease: "steps(24)" }, at)
          .set(row.querySelector(".rw-rac"), { display: "inline" }, at)
          .set(row.querySelector(".rw-cnf"), { display: "none" }, at)
          .set(row.querySelector(".rw-rac"), { display: "none" }, at + 0.9)
          .set(row.querySelector(".rw-cnf"), { display: "inline" }, at + 0.9);
      });
      tl.from(".rw-chart-stamp", { scale: 2.6, opacity: 0, rotate: -50, duration: 0.42, ease: "power4.in" }, ">-0.1").call(() => play("drop"));
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <section id="process" ref={root} className="rw-chartsec" aria-labelledby="rw-chart-h">
      <div className="rw-door" aria-hidden>
        <span>{coach}</span>
      </div>
      <div className="rw-chart">
        <span className="rw-tape rw-tape-l" aria-hidden />
        <span className="rw-tape rw-tape-r" aria-hidden />
        <header className="rw-chart-head">
          <h2 id="rw-chart-h">
            <span lang="hi" className="rw-hi">
              आरक्षण चार्ट
            </span>
            <span data-chaos-type>Reservation chart</span>
          </h2>
          <dl>
            <div>
              <dt>Train</dt>
              <dd>
                {train.no} {train.name}
              </dd>
            </div>
            <div>
              <dt>Passengers</dt>
              <dd>{pad(process.length)} · how it was built</dd>
            </div>
            <div>
              <dt>Prepared</dt>
              <dd>{year}</dd>
            </div>
          </dl>
        </header>

        <div role="table" aria-label="Process" className="rw-chart-table">
          <div role="row" className="rw-chart-cols">
            <span role="columnheader">S.No</span>
            <span role="columnheader">Passenger</span>
            <span role="columnheader">Berth</span>
            <span role="columnheader">Status</span>
          </div>
          {process.map((p, i) => (
            <div role="row" key={p.title} className="rw-chart-row">
              <span role="cell" className="rw-chart-no">
                {pad(i + 1)}
              </span>
              <span role="cell" className="rw-chart-name">
                <b>{p.title}</b>
                <span>{p.body}</span>
              </span>
              <span role="cell" className="rw-chart-berth">
                {pad(i * 3 + 1)} {BERTH[(i * 3) % 8]}
              </span>
              <span role="cell" className="rw-chart-status">
                <span className="rw-rac">RAC</span>
                <span className="rw-cnf">CNF</span>
              </span>
            </div>
          ))}
        </div>

        <svg className="rw-chart-stamp" viewBox="0 0 200 200" aria-hidden>
          <defs>
            <path id="rw-stamp-ring" d="M100 100 m-74 0 a74 74 0 1 1 148 0 a74 74 0 1 1 -148 0" />
          </defs>
          <circle cx="100" cy="100" r="92" />
          <circle cx="100" cy="100" r="58" />
          <text fontSize="17" letterSpacing="3.5">
            <textPath href="#rw-stamp-ring">CHART PREPARED · CHART PREPARED ·</textPath>
          </text>
          <text x="100" y="96" textAnchor="middle" fontSize="26" style={{ fontFamily: "var(--rw-hi)" }}>
            चार्ट तैयार
          </text>
          <text x="100" y="124" textAnchor="middle" fontSize="15" letterSpacing="2">
            {year}
          </text>
        </svg>
        <p className="rw-chart-foot">Charting is final. Changes at the discretion of the TTE.</p>
      </div>
    </section>
  );
}
