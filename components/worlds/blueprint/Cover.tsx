"use client";
// Sheet A-001: identity. The blue stage and the title are the portal morph targets (rendered at once,
// never animated in); around them the campus site plan drafts itself once the boot screen is gone.
import { useRef } from "react";
import { ArrowDown } from "lucide-react";
import { useLenis } from "lenis/react";
import { Morph } from "@/components/transitions/Morph";
import { Button } from "@/components/ui/Button";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { useSystem } from "@/lib/system";
import { morph } from "@/lib/transitions";
import type { Project } from "@/lib/types";
import { Compass } from "./Compass";
import { buildingOf, upNext, toMin } from "./logic";
import type { BlueprintScene } from "./scene";
import { SitePlan } from "./SitePlan";
import { TitleBlock } from "./TitleBlock";

export function Cover({ project, sheets }: { project: Project<BlueprintScene>; sheets: number }) {
  const { scene, slug, title, color } = project;
  const ref = useRef<HTMLElement>(null);
  const settled = useRef(false);
  const reduced = useReducedMotion();
  const ready = useSystem((s) => s.ready);
  const booted = useSystem((s) => s.booted);
  const lenis = useLenis();
  const next = upNext(scene.week, scene.now.day, toMin(scene.now.time));
  const [primary, ...rest] = project.links;

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const lines = q("[data-bd]");
      const ink = q("[data-bi]");
      // The server-rendered sheet keeps its linework hidden (CSS, [data-draft]) until GSAP owns it, with
      // a CSS failsafe that shows it anyway if JS is late. If that already happened, the visitor has
      // seen the finished plan: keep it, never un-draw it.
      if (el.hasAttribute("data-draft") && lines[0] && getComputedStyle(lines[0]).opacity !== "0") settled.current = true;
      el.removeAttribute("data-draft");
      if (reduced || settled.current) return;
      gsap.set(lines, { drawSVG: 0 });
      gsap.set(ink, { autoAlpha: 0 });
      if (!ready) return; // first paint before the system has read storage: decide next tick
      const draw = () =>
        gsap
          .timeline({ delay: 0.25 })
          .to(lines, { drawSVG: "100%", duration: 1.5, ease: "power2.inOut", stagger: { each: 0.018, from: "random" } })
          .to(ink, { autoAlpha: 1, duration: 0.6, stagger: 0.015, ease: "power1.out" }, 0.9);
      if (booted) draw();
      else gsap.delayedCall(8, draw); // the boot overlay is up; never leave the sheet blank if it hangs
    },
    { scope: ref, dependencies: [ready, booted, reduced], revertOnUpdate: true },
  );

  const go = (href: string) => {
    play("click");
    if (lenis) lenis.scrollTo(href, { offset: -8 });
    else document.querySelector(href)?.scrollIntoView();
  };

  return (
    <section ref={ref} aria-labelledby="bp-title" className="bp-cover" data-draft="">
      <Morph name={morph.stage(slug)}>
        <div aria-hidden className="bp-stage bp-paper" style={{ backgroundColor: color.bg }} />
      </Morph>
      <div aria-hidden className="bp-exposure" />

      <div className="bp-cover-in frame">
        <p className="bp-cover-head label">
          <span>Site plan · {scene.institute.name}, {scene.institute.city}</span>
          <span className="hidden sm:inline">
            {scene.now.date} · {scene.now.time}
          </span>
        </p>

        {/* phone: title, plan, intro (this wrapper is display: contents); desktop: one column beside the plan */}
        <div className="bp-cover-left">
          <div className="bp-cover-title">
            <Morph name={morph.title(slug)} variant="text">
              <h1 id="bp-title" data-chaos-type className="bp-title">
                {title.split(" ").map((w, i) => (
                  <span key={i} className="bp-title-line">
                    {w}
                  </span>
                ))}
              </h1>
            </Morph>
            <p className="bp-tagline">
              <svg aria-hidden viewBox="0 0 80 40" className="bp-tagline-leader">
                <path data-bd d="M78 6H34L4 34" />
                <path data-bd d="M4 34l9-3.5M4 34l2.5-9" />
              </svg>
              {project.tagline}
            </p>
          </div>

          <div className="bp-cover-intro">
            <p className="bp-lede">{project.description}</p>
            <div className="bp-cta">
              {primary && (
                <Button variant="accent" size="md" icon={<ArrowDown size={16} strokeWidth={2} />} onClick={() => go(primary.href)}>
                  {primary.label}
                </Button>
              )}
              {rest.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="bp-link"
                  data-cursor="hover"
                  onPointerEnter={() => play("tick")}
                  onClick={(e) => {
                    e.preventDefault();
                    go(l.href);
                  }}
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="bp-cover-plan">
          <SitePlan campus={scene.campus} to={next ? buildingOf(next.slot.room) : ""} room={next?.slot.room ?? ""} className="bp-siteplan" />
          <Compass zone={ref} className="bp-cover-compass" />
        </div>

        <TitleBlock project={project} sheets={sheets} className="bp-cover-tb" />
      </div>
    </section>
  );
}
