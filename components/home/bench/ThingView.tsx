// What each bench object looks like. Pure markup; size and skin come from bench.css.
import type { Thing } from "./things";

const INK = "#111111";

export function ThingView({ t, screen, ok }: { t: Thing; screen?: string; ok?: boolean }) {
  switch (t.kind) {
    case "key":
      return (
        <span className="bn-keytop">
          <span className="bn-legend">{t.char}</span>
        </span>
      );
    case "crt":
      return (
        <>
          <span className="bn-screen" data-ok={ok || undefined}>
            <span className="crt bn-crttext">
              {ok ? `${screen} OK` : `>${screen ?? ""}`}
              <span className="bn-caret">_</span>
            </span>
          </span>
          <span className="bn-side">
            <i />
            <i />
            <i />
            <b />
          </span>
        </>
      );
    case "pill":
      return (
        <>
          <i />
          <i />
        </>
      );
    case "knob":
    case "switch":
      return <i />;
    case "star":
      return (
        <svg viewBox="0 0 100 100" className="size-full overflow-visible">
          <path
            d="M50 7 61.8 36.8 93.8 38.8 69 59.2 77 90.2 50 73 23 90.2 31 59.2 6.2 38.8 38.2 36.8Z"
            fill={INK}
            stroke={INK}
            strokeWidth={6}
            strokeLinejoin="round"
          />
          <path d="M50 22 56 38" stroke="#f2eee7" strokeOpacity={0.35} strokeWidth={3} strokeLinecap="round" />
        </svg>
      );
    case "bolt":
      return (
        <svg viewBox="0 0 70 110" className="size-full overflow-visible">
          <path d="M40 3 6 62h26l-8 45 40-63H38L50 3Z" fill="#d8ff00" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
        </svg>
      );
    case "cube":
      return (
        <svg viewBox="0 0 100 100" className="size-full overflow-visible">
          <g stroke={INK} strokeWidth={3} strokeLinejoin="round">
            <path d="M50 4 90.7 27.5 50 51 9.3 27.5Z" fill="#f8f7f3" />
            <path d="M9.3 27.5 50 51v47L9.3 74.5Z" fill="#e8e2d7" />
            <path d="M90.7 27.5v47L50 98V51Z" fill="#c9c1b2" />
          </g>
          <ellipse cx="50" cy="27.5" rx="7" ry="4" fill="#ff5a1f" />
          <ellipse cx="22" cy="58" rx="3.2" ry="4.6" fill={INK} />
          <ellipse cx="37" cy="68" rx="3.2" ry="4.6" fill={INK} />
        </svg>
      );
    case "nut":
      return (
        <svg viewBox="0 0 100 100" className="size-full overflow-visible">
          <path d="M50 3 90.7 26.5v47L50 97 9.3 73.5v-47Z" fill="#c9c3b8" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
          <circle cx="50" cy="50" r="27" fill="none" stroke={INK} strokeOpacity={0.35} strokeWidth={3} />
          <circle cx="50" cy="50" r="19" stroke={INK} strokeWidth={4} style={{ fill: "var(--bg)" }} />
        </svg>
      );
    default:
      return null; // ring: drawn entirely by CSS
  }
}
