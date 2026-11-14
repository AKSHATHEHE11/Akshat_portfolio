import type { CSSProperties } from "react";
import { pad } from "@/lib/utils";
import "./work.css";
import { Mark, Tag } from "@/components/system/graffiti/Graffiti";

const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/** "Selected Works" with the highlighter blob, the one-line note and the live project counter. */
export function Header({ count }: { count: number }) {
  return (
    <header className="wk-head relative">
      <h1 className="wk-h1" aria-label="Selected Works">
        <span className="wk-mask">
          <span className="wk-word" data-in="rise" data-chaos-type>
            Selected
          </span>
        </span>
        <span className="wk-works">
          <Mark shape="crown" paint="orange" tilt={-14} delay={900} className="-top-[0.55em] -left-[0.15em] w-[0.75em]" />
          <svg className="wk-blob" viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden data-in="blob" style={d(260)}>
            <path d="M9 13 C46 4 170 2 288 7 C297 8 301 15 300 30 C299 52 298 70 294 84 C291 93 280 97 258 95 C180 92 92 97 21 94 C10 93 3 86 4 71 C5 50 1 26 9 13 Z" />
          </svg>
          <span className="wk-mask">
            <span className="wk-word" data-in="rise" style={d(420)}>
              Works
            </span>
          </span>
        </span>
        <svg className="wk-arrow" viewBox="0 0 64 30" fill="none" aria-hidden data-chaos-drift>
          <path
            d="M2 19 C14 14 26 21 38 16 C45 13 51 15 59 14"
            pathLength={1}
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            data-in="draw"
            style={d(780)}
          />
          <path
            d="M49 5 L60 14 L48 24"
            pathLength={1}
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            data-in="draw"
            style={d(1080)}
          />
        </svg>
      </h1>

      <Tag paint="lime" tilt={-7} delay={1300} drips={[0.3, 0.7]} className="right-[10%] top-[38%] max-lg:hidden">
        fresh
      </Tag>
      <div className="wk-aside">
        <p className="wk-note" data-in="fade" style={d(380)}>
          No case-study template here. Every project opens into a world built for it.
        </p>
        <div className="wk-count" data-in="fade" style={d(480)}>
          <span className="wk-dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span className="wk-count-num">{pad(count)}</span>
          <span className="wk-count-label">
            Projects
            <br />
            and counting…
          </span>
        </div>
      </div>
    </header>
  );
}
