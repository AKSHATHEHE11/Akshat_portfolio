// The rail-joint rhythm: one "da-dum" per joint the bogie rolls over. Called by distance, not by
// time, so the rhythm speeds up and stops with the train. Silent unless the visitor turned sound on.
import { getAudio } from "@/lib/sound";
import { system } from "@/lib/system";

let last = 0;

export function clack(strength = 1) {
  if (!system.get().sound) return;
  const nowMs = performance.now();
  if (nowMs - last < 110) return;
  last = nowMs;
  const a = getAudio();
  if (!a) return;
  const { ctx, out } = a;
  [0, 0.085].forEach((delay, i) => {
    const t = ctx.currentTime + delay;
    const body = ctx.createOscillator();
    const g = ctx.createGain();
    body.type = "triangle";
    body.frequency.setValueAtTime(i ? 82 : 98, t);
    body.frequency.exponentialRampToValueAtTime(42, t + 0.09);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2 * strength * (i ? 0.7 : 1), t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    body.connect(g).connect(out);
    body.start(t);
    body.stop(t + 0.13);

    const tick = ctx.createOscillator();
    const tg = ctx.createGain();
    tick.type = "square";
    tick.frequency.setValueAtTime(1900 - i * 320, t);
    tg.gain.setValueAtTime(0.0001, t);
    tg.gain.exponentialRampToValueAtTime(0.016 * strength, t + 0.002);
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    tick.connect(tg).connect(out);
    tick.start(t);
    tick.stop(t + 0.04);
  });
}
