"use client";
import { useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowRight, Check, Megaphone } from "lucide-react";
import { useLenis } from "lenis/react";
import { Morph } from "@/components/transitions/Morph";
import { Button } from "@/components/ui/Button";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useMediaQuery, useOnScreen, useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { morph } from "@/lib/transitions";
import type { Project } from "@/lib/types";
import { Landscape, newDrive, type SceneryItem } from "./Landscape";
import { Kulhad, Lamp, Tiffin } from "./Props";
import { RouteLine } from "./RouteLine";
import { FlapWord, SplitFlap } from "./SplitFlap";
import { clack } from "./clack";
import { dayT, fmt, haltOf, readPnr, routeGeo } from "./rail";
import type { RailwayScene } from "./scene";
import Timetable from "./Timetable";

/**
 * Identity + story. You sit in the coach at New Delhi, title on the wall, chai on the table.
 * Scrolling departs: the window grows to fill the view and scroll progress drives the train down
 * the route — the landscape runs past, the sky moves from morning to dusk, the display above the
 * window flips at every halt and the app in the glass updates. The story plays as PA announcements.
 */
/** parked a few metres short of the New Delhi board, so the app card in the glass doesn't cover it */
const PARK = -0.18;
/** phones in landscape: the pinned coach can't fit between nav and shell bar, so the ride is printed */
const SHORT = "(max-height: 500px)";

export default function Journey({ project }: { project: Project<RailwayScene> }) {
  const { scene, slug } = project;
  const reduced = useReducedMotion();
  const short = useMediaQuery(SHORT);
  const still = reduced || short;
  const lenis = useLenis();
  const root = useRef<HTMLElement>(null);
  const driveRef = useRef(newDrive({ d: PARK }));
  const routeHandle = useRef<((km: number) => void) | null>(null);
  const clockEl = useRef<HTMLSpanElement>(null);
  const anns = useRef<(HTMLDivElement | null)[]>([]);
  const onScreen = useOnScreen(root);
  const [lamp, setLamp] = useState(true);
  const [pos, setPos] = useState({ i: 0, at: true });

  const geo = useMemo(() => routeGeo(scene.route), [scene.route]);
  const items = useMemo<SceneryItem[]>(
    () => [
      ...geo.stops.map((station, i) => ({ D: geo.D[i], station, kind: "platform" as const })),
      ...geo.minors.map((m) => ({ ...m, kind: "board" as const })),
    ],
    [geo],
  );
  const trip = useMemo(() => readPnr(scene.pnr, scene.train.consist), [scene.pnr, scene.train.consist]);
  const pools = useMemo(() => ({ en: scene.route.map((s) => s.en), hi: scene.route.map((s) => s.hi) }), [scene.route]);
  const story = [
    { lead: "Problem", text: project.challenge },
    { lead: "Fix", text: project.solution },
    { lead: "Result", text: project.outcome },
  ];

  useGSAP(
    () => {
      const el = root.current;
      // matchMedia too: useMediaQuery reports false until its effect runs, which would pin for a frame
      if (!el || still || window.matchMedia(SHORT).matches) return;
      const proxy = { d: PARK };
      const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
      tl.to(el, { "--zoom": 1, duration: 1, ease: "power2.inOut" }, 0);
      let at = 0.65;
      // each leg: pull out, run, brake into the next platform; the PA announcement plays mid-leg
      const LEG = 3.4;
      const HALT = 1;
      geo.D.slice(1).forEach((Dn, i) => {
        tl.to(proxy, { d: Dn, duration: LEG, ease: "power2.inOut" }, at);
        const a = anns.current[i];
        if (a)
          tl.fromTo(a, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, at + 0.7).to(
            a,
            { opacity: 0, y: -18, duration: 0.3, ease: "power2.in" },
            at + 2.65,
          );
        at += LEG + HALT;
      });
      tl.to({}, { duration: 0.8 }, at - HALT); // hold at the terminus

      let joint = 0;
      let cur = { i: 0, at: true };
      tl.eventCallback("onUpdate", () => {
        const d = proxy.d;
        driveRef.current.d = d;
        const { clock, km } = geo.at(Math.max(0, d));
        driveRef.current.t = dayT(scene.route, clock);
        if (clockEl.current) clockEl.current.textContent = fmt(clock);
        routeHandle.current?.(km);
        const atI = d < geo.D[0] + 0.03 ? 0 : geo.D.findIndex((D) => Math.abs(D - d) < 0.03);
        const nextI = geo.D.findIndex((D) => D > d);
        const p = atI >= 0 ? { i: atI, at: true } : { i: nextI < 0 ? geo.D.length - 1 : nextI, at: false };
        if (p.i !== cur.i || p.at !== cur.at) {
          cur = p;
          setPos(p);
        }
        const j = Math.floor(d / 0.6);
        if (j !== joint) {
          joint = j;
          clack();
        }
        el.classList.toggle("rw-zoomed", tl.time() > 0.45);
      });

      ScrollTrigger.create({
        animation: tl,
        trigger: el,
        start: "top top",
        end: () => `+=${Math.round(window.innerHeight * 6)}`,
        pin: true,
        scrub: 0.6,
        invalidateOnRefresh: true,
      });

      // back to the parked train if this scene is torn down (reduced motion switched on, unmount)
      return () => {
        el.classList.remove("rw-zoomed");
        driveRef.current.d = PARK;
        driveRef.current.t = 0;
        routeHandle.current?.(0);
        setPos({ i: 0, at: true });
      };
    },
    { scope: root, dependencies: [still, geo], revertOnUpdate: true },
  );

  const st = geo.stops[pos.i];
  const origin = pos.i === 0;
  const terminus = st.kind === "terminus";
  const label = pos.at ? (origin ? "DEPARTING" : terminus ? "TERMINATES" : "ARRIVED") : "NEXT STOP";
  const time = (pos.at && origin ? st.dep : st.arr) ?? "";
  const halt = haltOf(st);
  const first = geo.stops[1];

  const scrollTo = (href: string) => {
    play("click");
    if (lenis) lenis.scrollTo(href);
    else document.querySelector(href)?.scrollIntoView();
  };
  const [primary, ...secondary] = project.links;
  const toggleLamp = () => {
    play(lamp ? "toggle-off" : "toggle-on");
    setLamp(!lamp);
  };

  // what the app in the glass is saying right now
  const card = origin
    ? { head: `Boarding at ${st.en}`, sub: `First halt ${first.en} · ${first.arr}`, dish: first.menu?.[0], done: false }
    : !pos.at
      ? { head: "Your meal is on the way!", sub: `Next halt ${st.en} · ${st.arr} · ${halt ? `${halt} min` : "last stop"}`, dish: st.menu?.[0], done: false }
      : terminus
        ? { head: `Arrived. ${st.en}.`, sub: `Waiting at the ${trip.coach} door`, dish: st.menu?.[0], done: true }
        : { head: `Delivered to ${trip.coach} · ${trip.seat}`, sub: `${st.en} · ${halt} min halt`, dish: st.menu?.[0], done: true };

  return (
    <>
      <section ref={root} id="journey" className="rw-scene" data-lamp={lamp ? "on" : "off"} aria-label={`${project.title}: the ride`}>
        <Morph name={morph.stage(slug)}>
          <div className="rw-wall absolute inset-0" />
        </Morph>
        <div className="rw-rack" aria-hidden />
        <div className="rw-dim" aria-hidden />

        <div className="rw-heroish rw-titleblock">
          <Morph name={morph.title(slug)} variant="text">
            <h1 className="rw-title" data-chaos-type>
              {project.title.split(" ").map((w, i) => (
                <span key={i} className="block">
                  {w}
                </span>
              ))}
            </h1>
          </Morph>
          <p className="rw-title-hi rw-hi" lang="hi">
            {scene.nameHi}
          </p>
          <p className="rw-tagline">{project.tagline}</p>
        </div>

        <div className="rw-heroish rw-ticket" data-chaos-drift>
          <div className="rw-ticket-head">
            <span>
              {scene.train.no} · {project.id}
            </span>
            <span className="rw-ticket-status">{project.status}</span>
          </div>
          <dl className="rw-ticket-rows">
            <div>
              <dt>Class</dt>
              <dd>{project.category}</dd>
            </div>
            <div>
              <dt>Year</dt>
              <dd>{project.year}</dd>
            </div>
            <div className="rw-ticket-role">
              <dt>Crew</dt>
              <dd>{project.role.join(" · ")}</dd>
            </div>
          </dl>
          <div className="rw-ticket-actions">
            {primary && (
              <Button variant="accent" size="sm" icon={<ArrowDown size={14} strokeWidth={2} />} onClick={() => scrollTo(primary.href)}>
                {primary.label}
              </Button>
            )}
            {secondary.map((l) => (
              <a key={l.href} href={l.href} className="rw-ticket-link hit" data-cursor="hover">
                {l.label}
              </a>
            ))}
          </div>
        </div>

        <div className="rw-win">
          <div className="rw-glow" aria-hidden />
          <div className="rw-pis">
            <span className="rw-pis-led" aria-hidden />
            <SplitFlap text={label} size={10} className="rw-pis-label" />
            <SplitFlap text={st.en} size={14} className="rw-pis-name" pool={pools.en} />
            <FlapWord text={st.hi} pool={pools.hi} className="rw-pis-hi" />
            <SplitFlap text={time} size={5} className="rw-pis-time" />
            <span className="rw-pis-meta">{pos.at && halt ? `HALT ${halt} MIN` : `PF ${st.pf}`}</span>
            <span className="rw-pis-clock" aria-hidden>
              <span ref={clockEl}>{fmt(geo.at(0).clock)}</span>
            </span>
          </div>

          <div className="rw-frame">
            <Landscape driveRef={driveRef} items={items} active={onScreen} coach={trip.coach} />
            <div className="rw-glass" aria-hidden />

            <div className="rw-jcard" data-done={card.done ? "1" : undefined}>
              <div className="rw-jcard-top">
                <span className="rw-jcard-brand">{project.title}</span>
                <span className="rw-jcard-pnr">PNR {scene.pnr}</span>
              </div>
              <p className="rw-jcard-head">{card.head}</p>
              <p className="rw-jcard-sub">{card.sub}</p>
              {card.dish && (
                <div className="rw-jcard-dish">
                  <span className="rw-veg" aria-label="Vegetarian" />
                  <span className="rw-jcard-dish-name">
                    {card.dish.name}
                    <small>{card.dish.kitchen}</small>
                  </span>
                  <span className="rw-jcard-price">₹{card.dish.price}</span>
                  {card.done ? (
                    <span className="rw-jcard-stamp">
                      <Check size={14} strokeWidth={3} aria-hidden /> Handed over
                    </span>
                  ) : (
                    <a href="#preview" className="rw-jcard-cta hit" data-cursor="hover">
                      Order now <ArrowRight size={14} strokeWidth={2.4} aria-hidden />
                    </a>
                  )}
                </div>
              )}
            </div>

            {!still &&
              story.map((b, i) => (
                <div
                  key={b.lead}
                  ref={(e) => {
                    anns.current[i] = e;
                  }}
                  className="rw-ann"
                >
                  <p className="rw-ann-pa">
                    <Megaphone size={14} strokeWidth={2} aria-hidden />
                    <span lang="hi" className="rw-hi">
                      {scene.announce.hi}
                    </span>
                    <span className="rw-ann-en">{scene.announce.en}</span>
                  </p>
                  <p className="rw-ann-text">
                    <b>{b.lead}.</b> {b.text}
                  </p>
                </div>
              ))}

            <RouteLine route={scene.route} handleRef={routeHandle} km={0} highlight={pos.at ? st.code : null} className="rw-route-journey" />
            <div className="rw-blind" aria-hidden>
              <span />
            </div>
            <div className="rw-gasket" aria-hidden />
          </div>

          <Lamp on={lamp} onToggle={toggleLamp} className="rw-heroish" />
          <div className="rw-table rw-heroish" aria-hidden>
            <div className="rw-table-items">
              <Tiffin />
              <Kulhad />
            </div>
          </div>
          {!still && (
            <p className="rw-heroish rw-hint" aria-hidden>
              Scroll to depart <ArrowDown size={14} strokeWidth={2} />
            </p>
          )}
        </div>
      </section>
      {still && <Timetable scene={scene} story={story} />}
    </>
  );
}
