// The CRT. A 2D canvas the scene uploads as a CanvasTexture (≤ 30 fps while visible).
// Modes: IDLE (smiley + typing), DESIGN (live pen-tool drawing), CODE (typing source),
// EXPERIMENT (oscilloscope with phosphor persistence), PLAY (breakout — the knob is the paddle).
import { profile } from "@/data/profile";
import { site } from "@/data/site";
import { play as sfx } from "@/lib/sound";
import { clamp, lerp, pad } from "@/lib/utils";
import { KEYS, type Mode, type Rig } from "./rig";

export const SCREEN_W = 720;
export const SCREEN_H = 490;
const W = SCREEN_W;
const H = SCREEN_H;
/** The gasket hides the outer ~4% — keep content inside this box. */
const S = { l: 48, r: 672, t: 50, b: 440 };

const IDLE_LINES = ["> DESIGN_", "> CODE_", "> EXPERIMENT_", "> REPEAT_"];
const ROLES = profile.roles.map((r) => r.toUpperCase());
const CITY = (profile.location.city.split(" ").pop() ?? "").slice(0, 3).toUpperCase();
const CODE = [
  'import { idea } from "./curiosity";',
  "",
  "export async function build(spark) {",
  "  const proto = await sketch(spark);",
  "  while (!proto.feelsRight()) {",
  "    proto.iterate({ taste: 0.92 });",
  "    coffee.refill(); // again",
  "  }",
  "  await test(proto, { users: 5 });",
  '  return ship(proto, "prod");',
  "}",
  "",
  "// it should exist. now it does.",
  "build(idea).then(observe);",
  "",
];
const KW = /^(import|from|export|async|function|const|await|while|return|if|new|let)$/;
const RATIOS: [number, number][] = [[1, 1], [1, 2], [2, 3], [3, 4], [3, 5], [4, 5], [5, 6], [2, 5]];
// Sideways pixel smiley ":)" — 4 × 7
const SMILE = ["..X.", "X..X", "...X", "...X", "...X", "X..X", "..X."];

const smooth = (t: number) => t * t * (3 - 2 * t);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Knob → phosphor hue. Centre is the house orange; left drifts to amber then P1 green, right to rose. */
export function phosphorHue(knob: number) {
  return knob < 0.5 ? lerp(122, 16, smooth(knob / 0.5)) : lerp(16, -14, (knob - 0.5) / 0.5);
}

export function createScreen(rig: Rig) {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const fx = overlay();
  const trail = document.createElement("canvas");
  trail.width = W;
  trail.height = H;
  const tctx = trail.getContext("2d")!;

  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-vt323").trim() || "monospace";
  let fontReady = false;
  const loaded = () => {
    fontReady = true;
    rig.invalidate();
  };
  void document.fonts.load(`40px ${family}`).then(loaded, loaded);

  const game = breakout();
  let hue = 16;
  let lastT = 0;
  let poweredAt = 0;
  let glitchUntil = 0;
  let glitchMode: Mode = "idle";
  let lastMode: Mode | null = null;
  let clock = "";
  let clockAt = 0;
  const sparks: { x: number; y: number; vx: number; vy: number; life: number }[] = [];

  const col = (a = 1, l = 58) => `hsla(${hue}, 100%, ${l}%, ${a})`;
  const font = (px: number) => (ctx.font = `${px}px ${family}`);
  function text(s: string, x: number, y: number, px: number, a = 1, glow = true, align: CanvasTextAlign = "left") {
    font(px);
    ctx.textAlign = align;
    ctx.fillStyle = col(a);
    ctx.shadowBlur = glow ? 12 : 0;
    ctx.shadowColor = col(0.85);
    ctx.fillText(s, x, y);
    ctx.shadowBlur = 0;
  }
  function brackets() {
    ctx.strokeStyle = col(0.75);
    ctx.lineWidth = 3;
    const k = 24;
    for (const [x, y, sx, sy] of [[S.l - 8, S.t - 6, 1, 1], [S.r + 8, S.t - 6, -1, 1], [S.l - 8, S.b + 8, 1, -1], [S.r + 8, S.b + 8, -1, -1]]) {
      ctx.beginPath();
      ctx.moveTo(x, y + sy * k);
      ctx.lineTo(x, y);
      ctx.lineTo(x + sx * k, y);
      ctx.stroke();
    }
  }
  function header(left: string, right: string) {
    text(left, S.l + 18, S.t + 34, 32, 0.6, false);
    text(right, S.r - 18, S.t + 34, 32, 0.6, false, "right");
  }

  /* ── IDLE ── */
  function idle(t: number, since: number) {
    if (t - clockAt > 1) {
      clockAt = t;
      try {
        clock = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: profile.location.timezone }).format(new Date());
      } catch {
        clock = "";
      }
    }
    header(site.version, `${CITY} ${clock}`);
    // smiley (winks every few seconds)
    const px = 18, sx = 88, sy = 150;
    const wink = !rig.reduced && t % 4.2 < 0.16;
    ctx.fillStyle = col(1);
    ctx.shadowBlur = 14;
    ctx.shadowColor = col(0.9);
    SMILE.forEach((row, r) =>
      [...row].forEach((c, k) => {
        if (c !== "X") return;
        if (wink && k === 0 && r === 1) return ctx.fillRect(sx + k * px - 4, sy + r * px + px / 2 - 2, px + 8, 4);
        ctx.fillRect(sx + k * px, sy + r * px, px - 2, px - 2);
      }),
    );
    ctx.shadowBlur = 0;

    const total = IDLE_LINES.join("").length;
    const typed = rig.reduced ? total : Math.floor((since % (total / 16 + 7)) * 16);
    let left = typed;
    IDLE_LINES.forEach((line, i) => {
      const shown = line.slice(0, clamp(left, 0, line.length));
      left -= line.length;
      const y = 168 + i * 60;
      if (shown) text(shown, 226, y, 54, 1);
      const typing = left < 0 && left + line.length >= 0;
      if (typing && !rig.reduced && t % 1 < 0.55) {
        ctx.fillStyle = col(1);
        ctx.fillRect(226 + measure(shown, 54), y - 40, 22, 44);
      }
    });
    // roles: decode one by one
    const cycle = 2.8;
    const idx = rig.reduced ? -1 : Math.floor(t / cycle) % ROLES.length;
    const role = idx < 0 ? ROLES.join(" / ") : ROLES[idx];
    const k = rig.reduced ? 1 : clamp((t % cycle) / 0.45);
    const shown = [...role].map((ch, i) => (i / role.length < k || ch === " " ? ch : "#$%&*/<>"[(i + Math.floor(t * 30)) % 8])).join("");
    text("ROLE", S.l + 18, S.b - 12, 32, 0.55, false);
    text(shown, S.l + 104, S.b - 12, idx < 0 ? 26 : 36, 0.95);
  }

  /* ── DESIGN ── */
  function design(t: number, since: number) {
    header("DESIGN.FIG", "PEN TOOL");
    ctx.fillStyle = col(0.22);
    for (let x = S.l + 24; x < S.r - 10; x += 32) for (let y = S.t + 60; y < S.b - 40; y += 32) ctx.fillRect(x, y, 2, 2);
    const tt = rig.reduced ? 1.2 : t;
    const ten = 0.55 + rig.knob * 0.9;
    const A = { x: 110, y: 320 }, B = { x: 360, y: 205 + Math.sin(tt * 0.9) * 26 }, C = { x: 610, y: 300 };
    const ha = { x: Math.cos(tt * 0.7) * 70 * ten, y: -90 * ten + Math.sin(tt * 0.6) * 20 };
    const hb = { x: 95 * ten + Math.sin(tt * 0.8) * 30, y: Math.cos(tt * 0.8) * 50 * ten };
    const hc = { x: -60 * ten, y: -80 * ten + Math.cos(tt * 0.5) * 25 };
    // artboard frame with selection handles
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = col(0.35);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(90, 140, 540, 220);
    ctx.setLineDash([]);
    // curve (draws itself on when the mode opens)
    const draw = rig.reduced ? 1 : clamp(since / 0.9);
    ctx.strokeStyle = col(1);
    ctx.lineWidth = 4;
    ctx.shadowBlur = 14;
    ctx.shadowColor = col(0.9);
    ctx.setLineDash([1400 * draw, 1400]);
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.bezierCurveTo(A.x + ha.x, A.y + ha.y, B.x - hb.x, B.y - hb.y, B.x, B.y);
    ctx.bezierCurveTo(B.x + hb.x, B.y + hb.y, C.x + hc.x, C.y + hc.y, C.x, C.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    // handles
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = col(0.6);
    const handle = (p: { x: number; y: number }, h: { x: number; y: number }, s = 1) => {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + h.x * s, p.y + h.y * s);
      ctx.stroke();
      ctx.fillStyle = col(1);
      ctx.beginPath();
      ctx.arc(p.x + h.x * s, p.y + h.y * s, 5, 0, Math.PI * 2);
      ctx.fill();
    };
    handle(A, ha);
    handle(B, hb, -1);
    handle(B, hb);
    handle(C, hc);
    for (const p of [A, B, C]) {
      ctx.fillStyle = "#0a0706";
      ctx.fillRect(p.x - 7, p.y - 7, 14, 14);
      ctx.strokeStyle = col(1);
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x - 7, p.y - 7, 14, 14);
    }
    // pixel cursor dragging B's out-handle
    const cx = B.x + hb.x + 6, cy = B.y + hb.y + 4;
    ctx.fillStyle = col(1);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy + 26);
    ctx.lineTo(cx + 7, cy + 19);
    ctx.lineTo(cx + 12, cy + 30);
    ctx.lineTo(cx + 17, cy + 28);
    ctx.lineTo(cx + 12, cy + 17);
    ctx.lineTo(cx + 21, cy + 17);
    ctx.closePath();
    ctx.fill();
    text(`X ${Math.round(B.x + hb.x)}  Y ${Math.round(B.y + hb.y)}`, S.l + 18, S.b - 12, 30, 0.7, false);
    text(`TENSION ${ten.toFixed(2)}`, S.r - 18, S.b - 12, 30, 0.7, false, "right");
  }

  /* ── CODE ── */
  const codeLen = CODE.map((l) => l.length + 1);
  const codeTotal = codeLen.reduce((a, b) => a + b, 0);
  let codeFrom = -1;
  let codePos = 0;
  function code(t: number, start: number, dt: number) {
    header("main.ts", "TS  0 ERRORS");
    // The knob sets the typing speed. Integrate it: progress = since × cps would scrub the file
    // back and forth while the knob turns.
    if (start !== codeFrom) {
      codeFrom = start;
      codePos = 0;
    }
    codePos = (codePos + dt * (26 + rig.knob * 70)) % (codeTotal * 2);
    let n = rig.reduced ? codeTotal - 1 : Math.floor(codePos);
    if (n >= codeTotal) n = codeTotal - 1; // hold the finished file for one cycle
    let line = 0;
    while (line < CODE.length - 1 && n >= codeLen[line]) n -= codeLen[line++];
    const rows = 9, lh = 37, x0 = S.l + 70;
    const first = Math.max(0, line - rows + 1);
    const cw = measure("0", 30);
    font(30);
    for (let r = 0; r < rows; r++) {
      const li = first + r;
      if (li > line) break;
      const y = S.t + 82 + r * lh;
      text(pad(li + 1), S.l + 14, y, 26, 0.32, false);
      const src = li === line ? CODE[li].slice(0, n) : CODE[li];
      let x = x0;
      for (const tok of src.split(/(\s+|[(){}.,;:!"]|\/\/.*$)/).filter(Boolean)) {
        const a = tok.startsWith("//") ? 0.42 : KW.test(tok) ? 1 : /^[(){}.,;:!"]$/.test(tok) ? 0.55 : 0.82;
        if (tok.trim()) text(tok, x, y, 30, a, a === 1);
        x += tok.length * cw;
      }
      if (li === line && !rig.reduced && t % 0.9 < 0.5) {
        ctx.fillStyle = col(1);
        ctx.fillRect(x0 + src.length * cw + 2, y - 24, 14, 28);
      }
    }
  }

  /* ── EXPERIMENT ── */
  function experiment(t: number, enter: boolean) {
    const [a, b] = RATIOS[Math.min(RATIOS.length - 1, Math.floor(rig.knob * RATIOS.length))];
    const cx = W / 2, cy = (S.t + S.b) / 2 + 8, ax = 250, ay = 150;
    if (enter) tctx.clearRect(0, 0, W, H);
    // graticule
    ctx.strokeStyle = col(0.12);
    ctx.lineWidth = 1;
    for (let i = -5; i <= 5; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * 50, cy - 160);
      ctx.lineTo(cx + i * 50, cy + 160);
      ctx.stroke();
    }
    for (let j = -4; j <= 4; j++) {
      ctx.beginPath();
      ctx.moveTo(cx - 250, cy + j * 40);
      ctx.lineTo(cx + 250, cy + j * 40);
      ctx.stroke();
    }
    ctx.strokeStyle = col(0.3);
    ctx.beginPath();
    ctx.moveTo(cx - 250, cy);
    ctx.lineTo(cx + 250, cy);
    ctx.moveTo(cx, cy - 160);
    ctx.lineTo(cx, cy + 160);
    ctx.stroke();
    // persistence: fade the trail, stroke the beam into it, composite
    const ph = rig.reduced ? 0.8 : t * 0.7;
    tctx.globalCompositeOperation = "destination-out";
    tctx.fillStyle = `rgba(0,0,0,${rig.reduced ? 1 : 0.28})`;
    tctx.fillRect(0, 0, W, H);
    tctx.globalCompositeOperation = "source-over";
    tctx.strokeStyle = col(1, 62);
    tctx.lineWidth = 3;
    tctx.shadowBlur = 16;
    tctx.shadowColor = col(1);
    tctx.beginPath();
    for (let i = 0; i <= 420; i++) {
      const u = (i / 420) * Math.PI * 2;
      const x = cx + Math.sin(a * u + ph) * ax, y = cy + Math.sin(b * u) * ay;
      if (i === 0) tctx.moveTo(x, y);
      else tctx.lineTo(x, y);
    }
    tctx.stroke();
    tctx.shadowBlur = 0;
    ctx.drawImage(trail, 0, 0);
    // beam head + sparks
    if (!rig.reduced) {
      const u = (t * 2.2) % (Math.PI * 2);
      const hx = cx + Math.sin(a * u + ph) * ax, hy = cy + Math.sin(b * u) * ay;
      if (sparks.length < 48) sparks.push({ x: hx, y: hy, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.7) * 120, life: 1 });
      ctx.fillStyle = col(1, 80);
      ctx.shadowBlur = 18;
      ctx.shadowColor = col(1);
      ctx.fillRect(hx - 5, hy - 5, 10, 10);
      ctx.shadowBlur = 0;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.life -= 1 / 30 / 0.8;
        if (p.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        p.x += p.vx / 30;
        p.y += p.vy / 30;
        p.vy += 4;
        ctx.fillStyle = col(p.life);
        ctx.fillRect(p.x, p.y, 3, 3);
      }
    }
    header("OSC  CH1 2V  CH2 1V", `F ${a}:${b}`);
    text(`PHASE ${(ph % (Math.PI * 2)).toFixed(2)}`, S.l + 18, S.b - 12, 30, 0.65, false);
  }

  function draw(now: number) {
    const t = now / 1000;
    const dt = clamp(t - lastT, 0, 0.05);
    lastT = t;
    if (rig.mode === "play") hue = 16;
    else hue = phosphorHue(rig.knob);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#0b0807";
    ctx.fillRect(0, 0, W, H);

    const p = rig.power;
    if (p < 0.5 || !fontReady) {
      powerOn(p / 0.5);
      ctx.drawImage(fx, 0, 0);
      return;
    }
    if (!poweredAt) poweredAt = now;
    if (p < 1) poweredAt = now;

    let show: Mode = rig.mode;
    if (rig.chaos && !rig.reduced && rig.mode !== "play") {
      if (now > glitchUntil && Math.random() < 0.014) {
        glitchUntil = now + 90 + Math.random() * 260;
        const others = (["idle", ...KEYS] as Mode[]).filter((m) => m !== rig.mode && m !== "play");
        glitchMode = others[Math.floor(Math.random() * others.length)];
      }
      if (now < glitchUntil) show = glitchMode;
    }
    const enter = show !== lastMode;
    lastMode = show;
    const start = Math.max(rig.modeAt, poweredAt);
    const since = Math.max(0, (now - start) / 1000);
    const sw = rig.reduced ? 1 : clamp((now - rig.modeAt) / 240);
    ctx.translate(0, (1 - easeOut(sw)) * 36);
    brackets();
    if (show === "idle") idle(t, since);
    else if (show === "design") design(t, since);
    else if (show === "code") code(t, start, dt);
    else if (show === "experiment") experiment(t, enter);
    else {
      if (enter) game.reset(true, now);
      game.step(dt, rig.knob, now);
      game.draw(ctx, text, col, now, rig.reduced);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (sw < 1) static_(1 - sw);
    if (rig.chaos && !rig.reduced && Math.random() < 0.3) tear();
    if (now - rig.knobAt < 1100 && rig.mode !== "play") osd(rig.knob);
    if (p < 1) {
      const k = (p - 0.5) / 0.5;
      const h = H * clamp(k / 0.35);
      ctx.fillStyle = `rgba(255, 226, 196, ${(1 - k) * 0.9})`;
      ctx.fillRect(0, H / 2 - h / 2, W, h);
    }
    if (!rig.reduced) {
      const y = ((t * 70) % (H + 160)) - 80;
      const g = ctx.createLinearGradient(0, y - 60, 0, y + 60);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.5, "rgba(255,240,225,0.045)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, y - 60, W, 120);
    }
    ctx.drawImage(fx, 0, 0);
  }

  function powerOn(k: number) {
    if (k <= 0) return;
    ctx.shadowBlur = 24;
    ctx.shadowColor = "rgba(255, 140, 80, 0.9)";
    ctx.fillStyle = "rgba(255, 232, 210, 0.95)";
    if (k < 0.4) {
      const r = 2 + 7 * (k / 0.4);
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const w = W * easeOut((k - 0.4) / 0.6);
      ctx.fillRect(W / 2 - w / 2, H / 2 - 2, w, 4);
    }
    ctx.shadowBlur = 0;
  }
  function static_(k: number) {
    for (let i = 0; i < 46; i++) {
      const y = Math.random() * H;
      ctx.fillStyle = `rgba(255, 230, 210, ${Math.random() * 0.5 * k})`;
      ctx.fillRect(0, y, W, 1 + Math.random() * 3);
    }
  }
  function tear() {
    for (let i = 0; i < 3; i++) {
      const y = Math.random() * H, h = 6 + Math.random() * 34, dx = (Math.random() - 0.5) * 70;
      ctx.drawImage(canvas, 0, y, W, h, dx, y, W, h);
    }
  }
  function osd(v: number) {
    const w = 360, x = W / 2 - w / 2, y = S.b - 64;
    ctx.fillStyle = "rgba(10, 7, 6, 0.85)";
    ctx.fillRect(x - 16, y - 34, w + 32, 60);
    text(rig.mode === "experiment" ? "RATIO" : "TUNE", x, y + 8, 28, 1, false);
    const n = 16, bx = x + 96;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = col(i / n < v ? 1 : 0.18);
      ctx.fillRect(bx + i * 14, y - 12, 10, 22);
    }
    text(pad(Math.round(v * 99)), x + w, y + 8, 28, 1, false, "right");
  }
  function measure(s: string, px: number) {
    font(px);
    return ctx.measureText(s).width;
  }

  return { canvas, draw };
}

/* ── PLAY: breakout. The tuning knob drives the paddle. ─────────────────────── */
type TextFn = (s: string, x: number, y: number, px: number, a?: number, glow?: boolean, align?: CanvasTextAlign) => void;

function breakout() {
  const F = { l: 60, r: 660, t: 104, b: 436 };
  const COLS = 9, ROWS = 4, GAP = 6, BH = 16;
  const BW = (F.r - F.l - GAP * (COLS - 1)) / COLS;
  const PW = 104, PH = 10, BALL = 10;
  let bricks: boolean[] = [];
  let px = (F.l + F.r) / 2;
  const ball = { x: 0, y: 0, vx: 0, vy: 0 };
  let lives = 3, score = 0, level = 1;
  let state: "ready" | "run" | "over" | "clear" = "ready";
  let stateAt = 0, startedAt = 0;

  function reset(full: boolean, now: number) {
    if (full) {
      lives = 3;
      score = 0;
      level = 1;
      startedAt = now;
    }
    bricks = Array.from({ length: COLS * ROWS }, () => true);
    serve(now);
  }
  function serve(now: number) {
    state = "ready";
    stateAt = now;
  }
  function launch() {
    const speed = 300 + level * 45;
    const a = (-0.5 + Math.random()) * 0.9;
    ball.vx = Math.sin(a) * speed;
    ball.vy = -Math.cos(a) * speed;
    state = "run";
  }

  function step(dt: number, knob: number, now: number) {
    const target = F.l + PW / 2 + knob * (F.r - F.l - PW);
    px += (target - px) * Math.min(1, dt * 22);
    if (state === "ready") {
      ball.x = px - BALL / 2;
      ball.y = F.b - PH - BALL - 6;
      if (now - stateAt > 900) launch();
      return;
    }
    if (state !== "run") {
      if (now - stateAt > 2200) {
        if (state === "over") reset(true, now);
        else {
          level++;
          reset(false, now);
        }
      }
      return;
    }
    const steps = Math.ceil(dt / 0.004);
    for (let s = 0; s < steps; s++) {
      const h = dt / steps;
      ball.x += ball.vx * h;
      ball.y += ball.vy * h;
      if (ball.x < F.l) {
        ball.x = F.l;
        ball.vx = Math.abs(ball.vx);
      }
      if (ball.x + BALL > F.r) {
        ball.x = F.r - BALL;
        ball.vx = -Math.abs(ball.vx);
      }
      if (ball.y < F.t - 30) {
        ball.y = F.t - 30;
        ball.vy = Math.abs(ball.vy);
      }
      const py = F.b - PH - 6;
      if (ball.vy > 0 && ball.y + BALL >= py && ball.y + BALL <= py + PH + 6 && ball.x + BALL > px - PW / 2 && ball.x < px + PW / 2) {
        const off = clamp((ball.x + BALL / 2 - px) / (PW / 2), -1, 1);
        const sp = Math.hypot(ball.vx, ball.vy);
        ball.vx = Math.sin(off * 1.05) * sp;
        ball.vy = -Math.cos(off * 1.05) * sp;
        sfx("tick");
      }
      const c = Math.floor((ball.x + BALL / 2 - F.l) / (BW + GAP));
      const r = Math.floor((ball.y + BALL / 2 - F.t) / (BH + GAP));
      if (c >= 0 && c < COLS && r >= 0 && r < ROWS && bricks[r * COLS + c]) {
        bricks[r * COLS + c] = false;
        ball.vy = -ball.vy;
        score += 10 * (ROWS - r);
        sfx("type");
        if (bricks.every((b) => !b)) {
          state = "clear";
          stateAt = now;
          sfx("success");
          return;
        }
      }
      if (ball.y > F.b + 20) {
        lives--;
        sfx("error");
        if (lives <= 0) {
          state = "over";
          stateAt = now;
        } else serve(now);
        return;
      }
    }
  }

  function draw(ctx: CanvasRenderingContext2D, text: TextFn, col: (a?: number, l?: number) => string, now: number, reduced: boolean) {
    text(`SCORE ${pad(score, 4)}`, F.l, 86, 28, 0.9, false);
    text(`LVL ${level}`, (F.l + F.r) / 2, 86, 28, 0.6, false, "center");
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = col(i < lives ? 1 : 0.18);
      ctx.fillRect(F.r - 14 - i * 22, 66, 14, 14);
    }
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        if (!bricks[r * COLS + c]) continue;
        ctx.fillStyle = col(1 - r * 0.17);
        ctx.fillRect(F.l + c * (BW + GAP), F.t + r * (BH + GAP), BW, BH);
      }
    ctx.shadowBlur = 14;
    ctx.shadowColor = col(1);
    ctx.fillStyle = col(1, 66);
    ctx.fillRect(px - PW / 2, F.b - PH - 6, PW, PH);
    if (state === "ready" || state === "run") ctx.fillRect(ball.x, ball.y, BALL, BALL);
    ctx.shadowBlur = 0;
    const blink = reduced || now % 900 < 600;
    const mid = (F.t + F.b) / 2 + 52;
    if (state === "over") text("GAME OVER", W / 2, mid, 54, 1, true, "center");
    else if (state === "clear") text("CLEARED", W / 2, mid, 54, 1, true, "center");
    else if (now - startedAt < 4200 && blink) text("< TURN THE KNOB >", W / 2, mid, 38, 1, true, "center");
  }

  return { reset, step, draw };
}

function overlay() {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "rgba(0,0,0,0.24)";
  for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.64);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.6)");
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
  return c;
}
