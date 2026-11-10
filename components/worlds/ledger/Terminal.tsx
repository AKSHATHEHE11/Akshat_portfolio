"use client";
// "Score a borrower" — the working product on the desk. Owns the run: which file is out, whether its
// statement has finished printing, and the what-if profile the faders edit. Everything shown is
// derived from that profile by the engine, so the dial, the reasons, the stamp and the slip agree.
// Desktop: drawer · printer · analysis. Tablet: files on a row, printer beside the analysis.
// Phones: files 2×2, the printer, then the analysis (scrolled into view when a print finishes).
import { useCallback, useEffect, useMemo, useRef, useState, type Ref } from "react";
import { useLenis } from "lenis/react";
import { Led } from "@/components/ui/marks";
import { useChaos, useOnScreen, useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { useSystem } from "@/lib/system";
import { apply, describeFlip, explain, flips as findFlips, type Change } from "./engine";
import { Dial } from "./Dial";
import { Files } from "./Files";
import { Printer } from "./Printer";
import { Reasons } from "./Reasons";
import type { LedgerScene, Profile } from "./scene";
import { BAND_WORD } from "./Stamp";
import { Verdict } from "./Verdict";
import { WhatIf } from "./WhatIf";

export function Terminal({ scene, title, slotRef }: { scene: LedgerScene; title: string; slotRef?: Ref<HTMLDivElement> }) {
  const chaos = useChaos();
  const reduced = useReducedMotion();
  const ready = useSystem((s) => s.ready);
  const booted = useSystem((s) => s.booted);
  const lenis = useLenis();
  const desk = useRef<HTMLElement>(null);
  const analysis = useRef<HTMLDivElement>(null);
  const live = useOnScreen(desk);
  const byUser = useRef(false);

  const [pick, setPick] = useState<number | null>(null);
  const [run, setRun] = useState(0);
  const [printed, setPrinted] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const borrower = pick === null ? null : scene.borrowers[pick];
  const x = useMemo(() => (printed && profile ? explain(profile) : null), [printed, profile]);
  const flips = useMemo(() => (printed && profile ? findFlips(profile) : null), [printed, profile]);

  const start = useCallback(
    (i: number, user = true) => {
      byUser.current = user;
      setPick(i);
      setProfile(scene.borrowers[i].profile);
      setPrinted(false);
      setRun((r) => r + 1);
      if (user) play("press");
    },
    [scene.borrowers],
  );
  const onDone = useCallback(() => setPrinted(true), []);
  const onReprint = useCallback(() => {
    if (pick !== null) start(pick);
  }, [pick, start]);
  const onApply = useCallback((changes: Change[]) => setProfile((p) => (p ? apply(p, changes) : p)), []);

  // The first file feeds itself in when the desk comes into view, so the room is never idle.
  useEffect(() => {
    const el = desk.current;
    if (!el || !ready || !booted || pick !== null) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        start(0, false);
      },
      { rootMargin: "0px 0px -35% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ready, booted, pick, start]);

  // stacked layouts: a print the visitor asked for ends with the dial brought up into view
  useEffect(() => {
    const el = analysis.current;
    if (!printed || !byUser.current || !el) return;
    if (el.getBoundingClientRect().top > window.innerHeight * 0.72) lenis?.scrollTo(el, { offset: -88 });
  }, [printed, lenis]);

  // the desk's printer finishing is worth a sound; the stamp brings its own
  useEffect(() => {
    if (printed && byUser.current) play("success");
  }, [printed]);

  const status = !borrower
    ? `${scene.borrowers.length} files on the desk`
    : !x
      ? `Printing ${borrower.name} · ${borrower.bank.lines.toLocaleString("en-IN")} lines`
      : `${borrower.name} · ${x.score} · ${BAND_WORD[x.band]}`;

  // screen readers hear the result once the faders stop moving, not on every step
  const [announce, setAnnounce] = useState("");
  const said = x && profile && borrower ? `${borrower.name}: ${x.score}, ${BAND_WORD[x.band]}. ${flips?.options[0] ? `${flips.worse ? "Breaks to" : "Reaches"} ${BAND_WORD[flips.goal]} with ${describeFlip(flips.options[0], profile)}.` : ""}` : status;
  useEffect(() => {
    const id = window.setTimeout(() => setAnnounce(said), 700);
    return () => window.clearTimeout(id);
  }, [said]);

  return (
    <section id="preview" ref={desk} aria-labelledby="lg-desk" className="frame relative z-[1] mt-12 scroll-mt-24 md:mt-16">
      <div className="relative rounded-[12px] border border-(--lg-fg)/14 bg-[linear-gradient(180deg,rgb(242_238_231/0.045),rgb(242_238_231/0.012))] shadow-[inset_0_1px_0_rgb(242_238_231/0.07),0_40px_80px_-40px_rgb(0_0_0/0.9)]">
        <header className="flex items-center justify-between gap-x-6 border-b border-(--lg-fg)/12 px-4 py-3 md:px-5">
          <h2 id="lg-desk" className="shrink-0 font-mono text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-(--lg-signal)">› Score a borrower</h2>
          <p className="flex min-w-0 items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-(--lg-fg)/60">
            <Led tone={!borrower ? "fg" : x ? "go" : "signal"} pulse={!!borrower && !x} />
            <span className="truncate">{status}</span>
          </p>
          <span className="sr-only" aria-live="polite">
            {announce}
          </span>
        </header>

        <div className="grid gap-7 p-3 sm:p-4 md:p-5 xl:grid-cols-[minmax(0,14.5rem)_minmax(0,24.5rem)_minmax(0,1fr)] xl:gap-8">
          <Files borrowers={scene.borrowers} active={pick} onPick={start} />
          <div className="grid gap-8 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:gap-6 xl:contents">
            {/* pinned beside the analysis only where the whole printer fits on screen */}
            <div className="md:top-[calc(var(--nav-h)+1rem)] md:self-start md:[@media(min-height:44rem)]:sticky">
              <Printer
                borrower={borrower}
                sizer={scene.borrowers[0]}
                run={run}
                printed={printed}
                reduced={reduced}
                chaos={chaos}
                slotRef={slotRef}
                onDone={onDone}
                onReprint={onReprint}
              />
            </div>
            <div ref={analysis} className="@container flex min-w-0 flex-col gap-7">
              <div className="grid items-start gap-6 @xl:grid-cols-2">
                <Dial score={x?.score ?? null} band={x?.band ?? null} pending={!!borrower && !x} chaos={chaos} reduced={reduced} live={live} />
                <Verdict
                  borrower={borrower}
                  x={x}
                  profile={profile}
                  flips={flips}
                  desk={scene.desk}
                  stampKey={`${run}:${x?.band}`}
                  reduced={reduced}
                  title={title}
                />
              </div>
              <Reasons x={x} reduced={reduced} />
              <WhatIf profile={x ? profile : null} base={borrower?.profile ?? null} flips={flips} onChange={setProfile} onApply={onApply} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
