"use client";
import { useId, type ReactNode } from "react";
import { profile } from "@/data/profile";
import { seeded } from "@/lib/utils";

// ponytail: the mark copy lives here because it is drawn into each stamp; move to data/profile.ts
// (e.g. profile.marks) if it ever needs editing without touching the art.
const T = "font-display";

/** Rubber-stamped compliance marks: slightly rotated, slightly rough, never quite the same twice. */
export function Stamps({ className }: { className?: string }) {
  const rough = `${useId().replace(/[^\w-]/g, "")}-rough`;
  const g = `url(#${rough})`;
  const city = profile.location.city.toUpperCase();

  const marks: { label: string; box: string; art: ReactNode }[] = [
    {
      label: "Handmade",
      box: "0 0 72 72",
      art: (
        <>
          <defs>
            <path id={`${rough}-ring`} d="M36,36 m-26,0 a26,26 0 1,1 52,0 a26,26 0 1,1 -52,0" />
          </defs>
          <circle cx="36" cy="36" r="34" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="36" cy="36" r="19.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d="M36 26.5v19M27.8 31.25l16.4 9.5M27.8 40.75l16.4-9.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <text className="font-mono" fontSize="7" fontWeight="600" letterSpacing="2.5" fill="currentColor">
            <textPath href={`#${rough}-ring`}>HANDMADE · HANDMADE · </textPath>
          </text>
        </>
      ),
    },
    {
      label: "No templates",
      box: "0 0 112 52",
      art: (
        <>
          <rect x="1.5" y="1.5" width="109" height="49" rx="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <g fill="none" stroke="currentColor" strokeWidth="1.3">
            {[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={10 + c * 10} y={12 + r * 10} width="7" height="7" />))}
          </g>
          <path d="M8 44 41 9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          <text x="47" y="23" className={T} fontSize="8.6" fontWeight="800" fill="currentColor">
            NO
          </text>
          <text x="47" y="35.5" className={T} fontSize="8.6" fontWeight="800" fill="currentColor">
            TEMPLATES
          </text>
        </>
      ),
    },
    {
      label: "Chai-powered",
      box: "0 0 112 52",
      art: (
        <>
          <rect x="1.5" y="1.5" width="109" height="49" rx="24.5" fill="none" stroke="currentColor" strokeWidth="2" />
          {/* a kulhad: clay cup, wider at the lip */}
          <path d="M14 22h22l-3.2 17.4a2 2 0 0 1-2 1.6H19.2a2 2 0 0 1-2-1.6Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M15.2 27h19.6" stroke="currentColor" strokeWidth="1" />
          <path d="M20 17c-1.6-1.8 1.6-3.2 0-5M25 17c-1.6-1.8 1.6-3.2 0-5M30 17c-1.6-1.8 1.6-3.2 0-5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <text x="44" y="24" className={T} fontSize="9.5" fontWeight="800" fill="currentColor">
            CHAI-
          </text>
          <text x="44" y="37" className={T} fontSize="9.5" fontWeight="800" fill="currentColor">
            POWERED
          </text>
        </>
      ),
    },
    {
      label: `Made in ${profile.location.city}`,
      box: "0 0 112 52",
      art: (
        <>
          <rect x="1.5" y="1.5" width="109" height="49" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
          <rect x="6" y="6" width="100" height="40" fill="none" stroke="currentColor" strokeWidth="0.8" />
          <text x="56" y="18.5" textAnchor="middle" className="font-mono" fontSize="6.4" fontWeight="600" letterSpacing="1.6" fill="currentColor">
            MADE IN
          </text>
          <text x="56" y="32" textAnchor="middle" className={T} fontSize="11" fontWeight="800" fill="currentColor">
            {city}
          </text>
          <text x="56" y="41" textAnchor="middle" className="font-mono" fontSize="4.6" letterSpacing="0.5" fill="currentColor">
            {profile.location.coords}
          </text>
        </>
      ),
    },
  ];

  return (
    <div className={className}>
      <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
        <filter id={rough} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <ul aria-label="Compliance marks" className="flex flex-wrap items-center gap-x-4 gap-y-3 text-ink">
        {marks.map((m, i) => (
          <li key={m.label} data-chaos-drift style={{ rotate: `${(seeded(i + 11) * 7 - 3.5).toFixed(1)}deg` }} className="opacity-[0.86]">
            <svg viewBox={m.box} role="img" aria-label={m.label} className="h-14 w-auto sm:h-16">
              {/* the drawn lettering is part of the art; the svg's label says it */}
              <g filter={g} aria-hidden>
                {m.art}
              </g>
            </svg>
          </li>
        ))}
      </ul>
    </div>
  );
}
