"use client";
// CredWise — AI credit intelligence that explains itself. One long page of a bank ledger fused with an
// analyst terminal: the title on the ruled sheet, the desk where a borrower gets scored (#preview),
// then the case history, the audit trail (#process), the journal, the machine and the closing figures.
import "./ledger.css";
import dynamic from "next/dynamic";
import { useEffect, useRef, type CSSProperties } from "react";
import { useChaos, useReducedMotion } from "@/lib/hooks";
import { on } from "@/lib/system";
import type { WorldProps } from "../types";
import { AuditTrail } from "./AuditTrail";
import { CaseHistory } from "./CaseHistory";
import { Journal } from "./Journal";
import { Machine } from "./Machine";
import type { LedgerScene } from "./scene";
import type { Burst } from "./Spew";
import { Stage } from "./Stage";
import { Terminal } from "./Terminal";
import { Ticker } from "./Ticker";

// chaos-only: fetched the first time chaos turns on
const Spew = dynamic(() => import("./Spew"), { ssr: false });

export default function LedgerWorld({ project }: WorldProps<LedgerScene>) {
  const { bg, fg, accent } = project.color;
  const { scene } = project;
  const slot = useRef<HTMLDivElement>(null);
  const chaos = useChaos();
  const reduced = useReducedMotion();
  // The toggles emit chaos:burst right after switching chaos on — before Spew can mount and listen —
  // so the point is kept here for Spew to pick up when it arrives.
  const burst = useRef<Burst | null>(null);
  useEffect(
    () =>
      on<{ x: number; y: number } | undefined>("chaos:burst", (p) => {
        burst.current = { x: p?.x ?? window.innerWidth / 2, y: p?.y ?? window.innerHeight / 2, t: performance.now() };
      }),
    [],
  );
  // The ledger is always ink-black. Shared components (Button, Led, Kbd…) read the semantic tokens,
  // so they are pointed at the world's palette here instead of the site theme.
  const palette = {
    "--lg-bg": bg,
    "--lg-fg": fg,
    "--lg-signal": accent,
    "--lg-up": "#5fd68a",
    "--lg-down": "#f2475e",
    "--bg": bg,
    "--fg": fg,
    "--fg-muted": `color-mix(in oklab, ${fg} 64%, ${bg})`,
    "--line": `color-mix(in oklab, ${fg} 14%, transparent)`,
    "--line-strong": fg,
    "--surface": `color-mix(in oklab, ${fg} 6%, ${bg})`,
    "--surface-2": `color-mix(in oklab, ${fg} 10%, ${bg})`,
    "--accent": accent,
    "--accent-ink": "#111111",
    "--signal": accent,
    "--signal-ink": "#111111",
    backgroundColor: bg,
    color: fg,
    colorScheme: "dark",
  } as CSSProperties;

  return (
    <div className="lg-ruled relative overflow-x-clip pb-28" style={palette}>
      <span aria-hidden className="lg-margin z-[1]" />
      <Stage project={project} />
      <Terminal scene={scene} title={project.title} slotRef={slot} />
      <CaseHistory project={project} />
      <AuditTrail project={project} />
      <Journal decisions={project.decisions} journal={scene.journal} />
      <Machine technologies={project.technologies} pipeline={scene.pipeline} />
      <Ticker metrics={project.metrics} ticker={scene.ticker} />
      {chaos && !reduced && <Spew slot={slot} burst={burst} borrowers={scene.borrowers} date={scene.desk.date} />}
    </div>
  );
}
