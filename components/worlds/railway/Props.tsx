// Objects inside the coach: the pendant lamp, a kulhad of chai, a steel tiffin, a meal parcel.
// Pure SVG + CSS (steam, spill and lamp states live in railway.css).
import { cn } from "@/lib/utils";

export function Lamp({ on, onToggle, className }: { on: boolean; onToggle: () => void; className?: string }) {
  return (
    <button
      type="button"
      className={cn("rw-lamp", className)}
      data-on={on ? "1" : "0"}
      aria-pressed={on}
      aria-label="Reading lamp"
      onClick={onToggle}
      data-cursor="hover"
      data-cursor-label={on ? "OFF" : "ON"}
    >
      <svg viewBox="0 0 120 300" aria-hidden>
        <defs>
          <linearGradient id="rw-brass" x1="0" x2="1">
            <stop offset="0" stopColor="#8f6a1f" />
            <stop offset=".45" stopColor="#e4b44a" />
            <stop offset="1" stopColor="#7a5718" />
          </linearGradient>
        </defs>
        <line x1="60" y1="0" x2="60" y2="200" stroke="#0d1424" strokeWidth="3" />
        <rect x="51" y="194" width="18" height="14" rx="3" fill="#2a2f3a" />
        <path d="M10 266 C 10 228, 34 206, 60 206 C 86 206, 110 228, 110 266 Z" fill="url(#rw-brass)" />
        <path d="M24 248 C 30 228, 44 216, 58 214" stroke="#fff3c4" strokeOpacity=".45" strokeWidth="4" fill="none" strokeLinecap="round" />
        <rect x="6" y="262" width="108" height="9" rx="4" fill="#6f4f17" />
        <ellipse className="rw-lamp-bulb" cx="60" cy="272" rx="24" ry="9" />
      </svg>
    </button>
  );
}

export function Kulhad({ className }: { className?: string }) {
  return (
    <span className={cn("rw-kulhad", className)} aria-hidden>
      <svg className="rw-steam" viewBox="0 0 100 120">
        <path d="M34 118 C 22 94, 46 80, 34 54 S 40 18, 30 0" />
        <path d="M52 118 C 64 96, 40 78, 54 52 S 48 20, 58 2" />
        <path d="M68 118 C 58 98, 78 84, 68 62 S 72 30, 66 14" />
      </svg>
      <svg className="rw-cup" viewBox="0 0 100 110">
        <path d="M12 20 L88 20 L77 98 Q 50 108 23 98 Z" fill="#b65a34" />
        <path d="M60 20 L88 20 L77 98 Q 70 101 62 102 Z" fill="#000" opacity=".16" />
        <path d="M18 34 L82 34" stroke="#000" strokeOpacity=".12" strokeWidth="2" />
        <ellipse cx="50" cy="20" rx="38" ry="7.5" fill="#9b4527" />
        <ellipse cx="50" cy="21" rx="32" ry="5" fill="#c98e55" />
      </svg>
      <span className="rw-spill" />
    </span>
  );
}

export function Tiffin({ className }: { className?: string }) {
  return (
    <svg className={cn("rw-tiffin", className)} viewBox="0 0 120 170" aria-hidden>
      <defs>
        <linearGradient id="rw-steel" x1="0" x2="1">
          <stop offset="0" stopColor="#6c747d" />
          <stop offset=".3" stopColor="#e6ebf0" />
          <stop offset=".55" stopColor="#a8b0b9" />
          <stop offset="1" stopColor="#5d646c" />
        </linearGradient>
      </defs>
      <path d="M16 58 Q 60 4 104 58" stroke="url(#rw-steel)" strokeWidth="7" fill="none" />
      <rect x="8" y="52" width="7" height="112" rx="3" fill="url(#rw-steel)" />
      <rect x="105" y="52" width="7" height="112" rx="3" fill="url(#rw-steel)" />
      {[60, 96, 132].map((y) => (
        <g key={y}>
          <rect x="16" y={y} width="88" height="33" rx="7" fill="url(#rw-steel)" />
          <rect x="16" y={y + 28} width="88" height="5" rx="2" fill="#000" opacity=".18" />
        </g>
      ))}
      <rect x="44" y="52" width="32" height="10" rx="4" fill="#59606a" />
    </svg>
  );
}
