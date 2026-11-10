// The pad synth's voice: two detuned oscillators through a plucked low-pass, into the site's own
// audio graph (lib/sound → master gain + compressor), so it sits at the same level as the UI sounds.
import { getAudio } from "@/lib/sound";
import { system } from "@/lib/system";

export const WAVES: { id: OscillatorType; label: string; path: string }[] = [
  { id: "sawtooth", label: "Saw", path: "M2 14 10 4v10l8-10v10l8-10v10" },
  { id: "square", label: "Square", path: "M2 14V4h6v10h6V4h6v10h6" },
  { id: "triangle", label: "Triangle", path: "M2 14 7 4l6 10 6-10 6 10" },
  { id: "sine", label: "Sine", path: "M2 9c2.5-7 5-7 7.5 0s5 7 7.5 0 5-7 7.5 0" },
];

/** Play one note. No-op while the visitor has sound off. Chaos bends each note in from up to ±9%. */
export function note(hz: number, wave: OscillatorType, chaos = false) {
  if (!system.get().sound) return;
  const wobble = chaos ? (Math.random() - 0.5) * 0.18 : 0;
  const a = getAudio();
  if (!a) return;
  const { ctx, out } = a;
  const t = ctx.currentTime;
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.Q.value = 7;
  f.frequency.setValueAtTime(wave === "sine" ? 2400 : 4600, t);
  f.frequency.exponentialRampToValueAtTime(360, t + 0.38);
  const g = ctx.createGain();
  const peak = wave === "sine" || wave === "triangle" ? 0.7 : 0.42;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
  f.connect(g).connect(out);
  for (const detune of [-6, 7]) {
    const o = ctx.createOscillator();
    o.type = wave;
    o.detune.value = detune;
    o.frequency.setValueAtTime(hz * (1 + wobble), t);
    if (wobble) o.frequency.exponentialRampToValueAtTime(hz, t + 0.22);
    o.connect(f);
    o.start(t);
    o.stop(t + 1);
  }
}
