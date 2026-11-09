"use client";
import { useRef, useState } from "react";
import { contact } from "@/data/contact";
import { profile } from "@/data/profile";
import { site } from "@/data/site";
import { Led } from "@/components/ui/marks";
import { Reveal } from "@/components/ui/Reveal";
import { Scramble } from "@/components/ui/Scramble";
import { ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useSystem } from "@/lib/system";
import { Accent } from "./contact/Accent";
import { Cross } from "./contact/Cross";
import { Links } from "./ending/Links";
import { RestartKey } from "./ending/RestartKey";
import { Rewind } from "./ending/Rewind";
import { sessionSeconds } from "./ending/session";
import { Uptime } from "./ending/Uptime";

const { ending } = contact;

/** SESSION COMPLETE — the last screen, and the way back to the first: hold RESTART to rewind the tape. */
export default function Ending() {
  const root = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(0); // re-keys the status line so it decodes each time you arrive
  const [rewindFrom, setRewindFrom] = useState<number | null>(null);
  const booted = useSystem((s) => s.booted); // keys the heading reveal so it re-arms after RESTART

  useGSAP(
    () => {
      ScrollTrigger.create({ trigger: root.current, start: "top 80%", onEnter: () => setSeen((n) => n + 1) });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="end" data-rail="End" aria-labelledby="end-title" className="relative pb-[clamp(5rem,12vh,8rem)]">
      <div className="frame">
        <div className="relative border-y border-line md:border-x md:px-[clamp(1.5rem,3.5vw,3.5rem)]">
          <Cross className="-left-[8px] -top-[8px] max-md:hidden" />
          <Cross className="-right-[8px] -top-[8px] max-md:hidden" />
          <Cross className="-bottom-[8px] -left-[8px] max-md:hidden" />
          <Cross className="-bottom-[8px] -right-[8px] max-md:hidden" />

          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-5 font-mono text-micro uppercase tracking-[0.14em]">
            <p className="flex items-center gap-2.5">
              <Led tone="go" />
              <span className="text-fg-muted">System status:</span>
              <Scramble key={seen} text={ending.status} />
            </p>
            <p className="text-fg-muted">
              Uptime <Uptime />
            </p>
          </div>

          <div className="grid gap-y-10 border-t border-line py-[clamp(2.5rem,7vh,4.5rem)] lg:grid-cols-12">
            <h2 id="end-title" data-chaos-type className="display text-display-s lg:col-span-7 lg:pr-10">
              {ending.heading.map((line, i) => (
                <Reveal key={`${line}-${booted}`} as="span" className="block" delay={i * 0.08}>
                  <Accent line={line} accent={ending.accent} />
                </Reveal>
              ))}
            </h2>
            <div className="flex flex-col justify-between gap-8 lg:col-span-5 lg:border-l lg:border-line lg:pl-10">
              <p className="max-w-[26ch] text-lede">{ending.line}</p>
              <RestartKey label={ending.restart} onConfirm={() => setRewindFrom(sessionSeconds())} />
            </div>
          </div>

          <Links />

          <div className="flex flex-col gap-2 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-label uppercase tracking-[0.2em]">{ending.signature}</p>
            <p className="text-[0.8125rem] text-fg-muted">
              © {site.build.slice(0, 4)} {profile.name}
            </p>
          </div>
        </div>
      </div>
      {rewindFrom !== null && <Rewind from={rewindFrom} onDone={() => setRewindFrom(null)} />}
    </section>
  );
}
