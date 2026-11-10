// Every line of text the lab shows. It is UI copy (labels, quips, the legend), not portfolio content —
// ponytail: lives beside the toys; move to data/ if it ever needs editing without touching code.

export const LEGEND: { id: string; name: string; line: string; keys: string[] }[] = [
  { id: "tray", name: "Tray", line: "Throw things. Gravity has three settings; the magnet only likes metal.", keys: ["G", "M"] },
  { id: "win", name: "Windows", line: "Drag them by the bar. Focus a bar and the arrows move it.", keys: ["←", "→"] },
  { id: "key", name: "Keycap", line: "Spin it, press it. Focus it and type: it becomes that key.", keys: ["⏎"] },
  { id: "bug", name: "Bug hunt", line: "Twenty seconds. Squash what crawls. Your best stays on this device.", keys: ["B"] },
  { id: "stamp", name: "Stamp", line: "Click any bare patch of mat. Every print is a new shape. X wipes the mat.", keys: ["X"] },
  { id: "well", name: "Gravity well", line: "Bends whatever comes near, your cursor included. Enter feeds it; arrows steer a probe.", keys: ["⏎"] },
  { id: "form", name: "Settings", line: "Fill it in. It has opinions.", keys: [] },
];

/** The unreasonable settings form. */
export const FORM = {
  file: "settings.cfg",
  slider: { label: "Confidence", fav: 72, chaosFav: 13, drift: "it prefers {f}", relent: "fine. {v} it is." },
  check: { label: "Don't show this again", undo: "(reflex. sorry.)", kept: "(ok. it stays.)" },
  save: "Save settings",
  saved: "SETTINGS SAVED. MOST OF THEM.",
};

export const TYPE_SAMPLE = "Width is a feeling. Weight is a decision.";

/** Two octaves of C minor pentatonic: hard to play a wrong note, easy to play a bad one. */
export const NOTES = [
  { name: "C", hz: 261.63, key: "a" },
  { name: "E♭", hz: 311.13, key: "s" },
  { name: "F", hz: 349.23, key: "d" },
  { name: "G", hz: 392.0, key: "f" },
  { name: "B♭", hz: 466.16, key: "g" },
  { name: "C", hz: 523.25, key: "h" },
  { name: "E♭", hz: 622.25, key: "j" },
  { name: "F", hz: 698.46, key: "k" },
];

/** The house accent lives at hue 120.3 (#D8FF00); the dial only reaches its relatives. */
export const ACCENTS = [
  { hue: 100, name: "Sulphur" },
  { hue: 120.3, name: "Lime" },
  { hue: 136, name: "Acid" },
  { hue: 152, name: "Mint" },
];
export const ACCENT_RANGE = [96, 156] as const;

export const FRAGMENT_LABELS = ["Submit", "Send it", "Continue", "Ship it", "Do the thing", "Proceed", "Save draft", "Approve", "OK", "Try again"];

export const RUNAWAY = ["nope", "almost", "too slow", "missed", "not today"];
export const GIVE_UP = "fine, you win";
