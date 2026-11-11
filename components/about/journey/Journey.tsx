"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { certs, reserved, stints, type Month, type Stint } from "@/data/experience";
import { profile } from "@/data/profile";
import { Button } from "@/components/ui/Button";
import { Led } from "@/components/ui/marks";
import { useReducedMotion, useSystemReady } from "@/lib/hooks";
import { play } from "@/lib/sound";
import "./journey.css";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ym = (d: Month) => (d.m ? `${MON[d.m - 1]} ${d.y}` : `${d.y}`);
const iso = (d: Month) => (d.m ? `${d.y}-${String(d.m).padStart(2, "0")}` : `${d.y}`);
const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** rack units fill from the bottom in start order: a running job is 2U, a stint with projects 3U */
const UNITS = stints.map((s, i) => ({ s, i, u: s.projects ? 3 : s.to ? 1 : 2 }));
const AT = UNITS.map((_, k) => 1 + UNITS.slice(0, k).reduce((a, x) => a + x.u, 0));
const TOP = AT[AT.length - 1] + UNITS[UNITS.length - 1].u;
const WORK = stints.filter((s) => s.kind === "work");
/** the newest job is pulled out on load */
const NEWEST = WORK[WORK.length - 1]?.id;
const OFFICES = WORK.filter((s) => s.place !== "Remote").length;
const SR = <span className="sr-only">, </span>;

/** "Aug 2026 → now", "Aug → Sep 2025", "2023 → now", "2020 → 2022" */
function When({ from, to }: { from: Month; to?: Month }) {
  const sameYear = to && from.m && to.m && from.y === to.y;
  return (
    <span className="ab-rk-when">
      <time dateTime={iso(from)}>{sameYear ? MON[from.m! - 1] : ym(from)}</time>
      <span aria-hidden> → </span>
      <span className="sr-only"> to </span>
      {to ? <time dateTime={iso(to)}>{ym(to)}</time> : "now"}
    </span>
  );
}

/** One stint. It owns its open state, so pulling it out re-renders this unit and nothing else. */
function Unit({ s, i, u, at }: { s: Stint; i: number; u: number; at: number }) {
  const [open, setOpen] = useState(s.id === NEWEST);
  const running = !s.to;
  const face = `rk-${s.id}-face`;
  const tray = `rk-${s.id}-tray`;
  return (
    <li id={`rk-${s.id}`} className="ab-rk-unit" data-kind={s.kind} data-state={running ? "run" : "done"} data-u={u} data-open={open || undefined} style={{ "--i": i } as CSSProperties}>
      <span aria-hidden className="ab-rk-unum">U{at}</span>
      <h3>
        <button
          id={face}
          type="button"
          className="ab-rk-face"
          aria-expanded={open}
          aria-controls={tray}
          data-cursor="open"
          data-cursor-label={open ? "PUSH" : "PULL"}
          data-chaos-drift={!running && !open ? "" : undefined}
          onPointerEnter={(e) => e.pointerType === "mouse" && play("tick")}
          onClick={() => {
            play(open ? "close" : "open");
            setOpen(!open);
          }}
        >
          <span aria-hidden className="ab-rk-handle" />
          <span aria-hidden className="ab-rk-handle" />
          <span aria-hidden className="ab-rk-led">
            {running ? <Led tone="go" pulse={false} /> : <span className="ab-rk-ring" />}
          </span>
          <span className="ab-rk-org">
            {s.short ?? s.org}
            {s.short && <span className="ab-rk-full"> {s.org}</span>}
          </span>
          {SR}
          <span className="ab-rk-st">{running ? "Running" : "Exit 0"}</span>
          {SR}
          <span className="ab-rk-role">
            {s.role}
            {SR}
            <span className="ab-rk-place">{[s.place, s.about].filter(Boolean).join(" · ")}</span>
          </span>
          {SR}
          <When from={s.from} to={s.to} />
          {s.projects ? (
            <>
              <span className="sr-only">, {count(s.projects.length, "project")} inside</span>
              <span aria-hidden className="ab-rk-extra ab-rk-bays">
                {s.projects.map((p, n) => (
                  <span key={p.id} className="ab-rk-bay">
                    <span className="ab-rk-bay-no">Bay {n + 1}</span>
                    <span className="ab-rk-bay-name">{p.bay}</span>
                  </span>
                ))}
              </span>
            </>
          ) : running && s.tags ? (
            <span aria-hidden className="ab-rk-extra">
              <span className="ab-rk-lcd">
                <span className="ab-rk-reel" style={{ "--n": s.tags.length } as CSSProperties}>
                  {s.tags.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </span>
              </span>
              <span className="ab-rk-vents" />
            </span>
          ) : (
            <span aria-hidden className={s.kind === "work" ? "ab-rk-ports" : "ab-rk-slot"} />
          )}
        </button>
      </h3>
      <div id={tray} role="region" aria-labelledby={face} className="ab-rk-tray" hidden={!open}>
        <div className="ab-swap ab-rk-tray-in" data-cols={s.tags ? "" : undefined}>
          {s.projects ? (
            <div>
              <p className="label text-smoke">{s.did[0]}</p>
              <ol className="ab-rk-projects">
                {s.projects.map((p, n) => (
                  <li key={p.id}>
                    <p aria-hidden className="label text-smoke">Bay {n + 1}</p>
                    <h4 className="ab-rk-pname">{p.name}</h4>
                    <p className="mt-1.5">{p.line}</p>
                    <ul className="ab-rk-tags" aria-label="Stack">
                      {p.stack.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <ul className="ab-rk-did">
              {s.did.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
          {s.tags && (
            <ul className="ab-rk-tags" aria-label="Tags">
              {s.tags.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}

/** The empty top slot. "Slot it in" hot-swaps a unit for your team into it; focus moves to its link. */
function Slot() {
  const team = useRef<HTMLDivElement>(null);
  const [slotted, setSlotted] = useState(false);
  useEffect(() => {
    if (slotted) team.current?.querySelector("a")?.focus();
  }, [slotted]);
  return (
    <div ref={team} className="ab-rk-unit" data-kind={slotted ? "team" : "reserved"} data-state={slotted ? "run" : undefined} style={{ "--i": stints.length } as CSSProperties}>
      <span aria-hidden className="ab-rk-unum">U{TOP}</span>
      {slotted ? (
        <div key="team" className="ab-rk-face">
          <span aria-hidden className="ab-rk-led">
            <Led tone="signal" pulse={false} />
          </span>
          <p className="ab-rk-org">{reserved.team}</p>
          <p className="ab-rk-st">Booting</p>
          <p className="ab-rk-role">
            {reserved.role}
            <span className="ab-rk-place">{reserved.start}</span>
          </p>
          <div className="ab-rk-cta">
            <Button href="/#contact" variant="signal" size="sm">
              {reserved.cta}
            </Button>
          </div>
        </div>
      ) : (
        <div key="slot" className="ab-rk-face">
          <span aria-hidden className="ab-rk-led">
            <span className="ab-rk-ring" />
          </span>
          <p className="ab-rk-org">{reserved.title}</p>
          <p className="ab-rk-role">{reserved.line}</p>
          <div className="ab-rk-cta">
            <Button
              variant="signal"
              size="sm"
              data-chaos-escape
              onClick={() => {
                play("drop");
                setSlotted(true);
              }}
            >
              {reserved.key}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * RACKED UP SO FAR — the career as a server rack: every school and job is a unit, installed in start
 * order from the bottom, so the newest sits on top. Running units are lit, finished ones read EXIT 0;
 * the B.Tech's drive bays are its projects. A unit pulls out (tap, click, Enter) to show what I did
 * there; the empty top slot hot-swaps in "your team". Scrolling in powers it on unit by unit, from
 * U1 up — all CSS, keyed off two attributes. Chaos: the rack overheats.
 */
export function Journey() {
  const rack = useRef<HTMLDivElement>(null);
  const ready = useSystemReady();
  const reduced = useReducedMotion();
  const motion = ready && !reduced;

  // data-live: on screen, so the LCD (the one loop) runs. data-armed: it was off-screen at mount (and
  // motion is allowed), so the units wait cold. data-on: its top crossed 75% of the screen: boot, once.
  useEffect(() => {
    const el = rack.current;
    if (!el) return;
    let first = true;
    // a fast jump can queue leave + enter in one batch: the last entry is the current state
    const live = new IntersectionObserver((es) => {
      const e = es[es.length - 1];
      if (e.isIntersecting) el.dataset.live = "";
      else delete el.dataset.live;
      if (first && motion && !e.isIntersecting) el.dataset.armed = "";
      first = false;
    });
    const boot = new IntersectionObserver(
      (es) => {
        if (!es[es.length - 1].isIntersecting || el.dataset.armed === undefined) return;
        el.dataset.on = "";
        play("toggle-on");
        boot.disconnect();
      },
      { rootMargin: "0px 0px -25% 0px" },
    );
    live.observe(el);
    boot.observe(el);
    return () => {
      live.disconnect();
      boot.disconnect();
      if (el.dataset.on === undefined) delete el.dataset.armed;
    };
  }, [motion]);

  return (
    <section id="journey" data-rail="Rack" aria-labelledby="ab-journey" className="frame scroll-mt-[var(--nav-h)] overflow-x-clip py-[clamp(4rem,11vh,8rem)]">
      <h2 id="ab-journey" data-chaos-type className="display mb-[clamp(2rem,6vh,4rem)] text-display-m">
        {profile.about.journey[0]} <span className="serif-accent">{profile.about.journey[1]}</span>
      </h2>
      <div className="grid gap-y-10 lg:grid-cols-12 lg:gap-x-(--gutter)">
        <div ref={rack} className="ab-rk lg:col-span-8">
          <p className="ab-rk-head label">
            <span>Akshat/OS · Rack 01</span>
            <span>
              <span className="ab-rk-thermal chaos-only">Thermal</span>
              {count(WORK.length, "job")} · {count(OFFICES, "office")}
            </span>
          </p>

          <Slot />

          <ol aria-label="Where I've worked and studied, newest first" className="ab-rk-list">
            {UNITS.map((x, k) => ({ ...x, at: AT[k] }))
              .reverse()
              .map(({ s, i, u, at }) => (
                <Unit key={s.id} s={s} i={i} u={u} at={at} />
              ))}
          </ol>
          <span aria-hidden className="ab-rk-plinth" />
        </div>

        <div className="ab-rk-certs lg:sticky lg:top-[calc(var(--nav-h)+2rem)] lg:col-span-4 lg:self-start">
          <p aria-hidden className="label text-fg-muted">Certified · undated</p>
          <ul aria-label="Certifications, undated" className="ab-rk-stickers">
            {certs.map((c) => (
              <li key={c.id} className="ab-rk-sticker">
                <span className="ab-rk-by">{c.by}</span> <span className="ab-rk-cert">{c.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
