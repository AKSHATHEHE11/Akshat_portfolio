// Shared, mutable state between the keycap's DOM controls (Keycap.tsx) and its 3D scene (Scene.tsx).
// The scene reads it in useFrame; nothing here causes a React render.
export interface KeyRig {
  yaw: number;
  /** rad/s while coasting */
  vyaw: number;
  pitchTarget: number;
  drag: boolean;
  /** performance.now() of the last press */
  press: number;
  legend: string;
  chaos: boolean;
}

export const createRig = (): KeyRig => ({ yaw: 0, vyaw: 0, pitchTarget: 0, drag: false, press: -1e9, legend: "A", chaos: false });

const NAMED: Record<string, string> = {
  Backspace: "⌫",
  Delete: "DEL",
  Shift: "⇧",
  CapsLock: "⇪",
  Control: "CTRL",
  Alt: "ALT",
  Meta: "⌘",
  Home: "HOME",
  End: "END",
  PageUp: "PG↑",
  PageDown: "PG↓",
  Insert: "INS",
};

/** The legend a pressed key would wear, or null to keep the current one (Space, Enter). */
export function legendFor(key: string): string | null {
  if (key === " " || key === "Enter") return null;
  if (key.length === 1) return key.toUpperCase();
  if (NAMED[key]) return NAMED[key];
  if (/^F\d{1,2}$/.test(key)) return key;
  return null;
}

/** Draw a legend centred on a square canvas (transparent ground, ink glyph). */
export function drawLegend(ctx: CanvasRenderingContext2D, text: string, family: string) {
  const s = ctx.canvas.width;
  ctx.clearRect(0, 0, s, s);
  ctx.fillStyle = "#16130f";
  const size = text.length > 3 ? 0.2 : text.length > 1 ? 0.3 : 0.5;
  ctx.font = `800 ${Math.round(s * size)}px ${family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, s / 2, s * 0.53);
}
