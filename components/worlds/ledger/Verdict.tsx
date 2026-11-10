"use client";
// The decision slip, torn off the printer. The stamp lands on it (again whenever a what-if moves the
// file across a line), and the verdict is written the way a person would say it — the one serif voice
// on the desk. Copy puts the whole explanation on the clipboard, ready for the file note.
import { useState, type CSSProperties } from "react";
import { motion } from "motion/react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { play } from "@/lib/sound";
import { emit } from "@/lib/system";
import { BASE, describeFlip, rupees, verdict, type Explanation, type Flips } from "./engine";
import type { Borrower, LedgerScene, Profile } from "./scene";
import { BAND_WORD, Stamp } from "./Stamp";

// shared components on paper speak ink-on-bone
const PAPER = { "--fg": "#0f100d", "--bg": "#f2eee7", "--line-strong": "#0f100d", "--accent": "#ff5a1f", "--accent-ink": "#111111" } as CSSProperties;

interface Props {
  borrower: Borrower | null;
  x: Explanation | null;
  profile: Profile | null;
  flips: Flips | null;
  desk: LedgerScene["desk"];
  /** changes when the stamp should land again */
  stampKey: string;
  reduced: boolean;
  title: string;
}

export function Verdict({ borrower, x, profile, flips, desk, stampKey, reduced, title }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!borrower || !x || !profile) return;
    const text = [
      `${title.toUpperCase()} — DECISION SLIP ${borrower.file} — ${desk.date}`,
      `${borrower.name}, ${borrower.occupation}, ${borrower.city}`,
      `Ask: ${rupees(borrower.ask.amount)} over ${borrower.ask.months} months (${borrower.ask.purpose})`,
      `Score: ${x.score} of 900 — ${BAND_WORD[x.band].toUpperCase()} (base ${BASE}, model ${desk.model})`,
      "Reasons:",
      ...x.top.map((f) => `  ${f.code.padEnd(9)} ${(f.points < 0 ? "−" : "+") + Math.abs(f.points)}  ${f.text}`),
      `  other     ${(x.other < 0 ? "−" : "+") + Math.abs(x.other)}`,
      ...(flips?.options[0] ? [`${flips.worse ? "Breaks" : "Changes"} if: ${describeFlip(flips.options[0], profile)} → ${flips.options[0].score}`] : []),
      `Verdict: ${verdict(x, borrower.ask)}`,
      "— scripted demo; deterministic scorecard, fictional applicant",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      emit("toast", { text: "Explanation copied to clipboard" });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      emit("toast", { text: "Clipboard blocked — select the slip text instead" });
    }
  };

  return (
    <div className="lg-paper lg-torn relative isolate flex min-h-[14.5rem] flex-col px-4 pb-4 pt-5 shadow-[0_24px_40px_-24px_rgb(0_0_0/0.95)]" style={PAPER}>
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] opacity-70">
        Decision slip{borrower ? ` · ${borrower.file}` : ""}
      </p>
      {x && borrower ? (
        <>
          <motion.span
            key={stampKey}
            aria-hidden
            className="pointer-events-none absolute right-3 top-6 z-[1] origin-center text-[clamp(1.3rem,1rem+1vw,1.65rem)]"
            initial={reduced ? false : { scale: 2.6, opacity: 0, rotate: -26 }}
            animate={{ scale: 1, opacity: 1, rotate: -8 }}
            transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 640, damping: 22, mass: 0.9 }}
            onAnimationStart={() => !reduced && play("drop")}
          >
            <Stamp tone={x.band} sub={`${desk.date} · ${x.score}`} />
          </motion.span>
          <p className="mt-12 max-w-[30ch] pr-2 font-serif text-[1.3rem] italic leading-[1.12] sm:text-[1.45rem]">{verdict(x, borrower.ask)}</p>
          <p className="mt-3 font-mono text-[0.6875rem] uppercase leading-relaxed tracking-[0.1em] opacity-70">
            Ask {rupees(borrower.ask.amount)} · {borrower.ask.months} mo · {borrower.ask.purpose}
          </p>
          <div className="mt-auto pt-4">
            <Button size="sm" variant="ink" magnetic={false} onClick={copy} icon={copied ? <Check size={14} /> : <Copy size={14} />}>
              {copied ? "Copied" : "Copy explanation"}
            </Button>
          </div>
        </>
      ) : (
        <p className="mt-auto font-serif text-[1.3rem] italic leading-[1.12] opacity-45">
          {borrower ? "Reading the statement…" : "No file on the desk yet."}
        </p>
      )}
    </div>
  );
}
