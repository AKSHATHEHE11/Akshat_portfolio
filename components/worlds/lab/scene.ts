// Scene content for the "lab" world (Null Field): the instrument's factory presets, the words its REC
// key names new presets with, the patch notes, the story beats, the signal-flow stages and the VU
// meter scales. Filled in data/projects/null-field.ts. Types only — no runtime imports, so the data
// file stays loadable by the node self-check.

/** The ten continuous controls (each one a shader uniform). Ranges live in components/worlds/lab/patch.ts. */
export type ParamKey = "warp" | "scale" | "detail" | "flow" | "hue" | "spread" | "feed" | "crush" | "grain" | "pixel";
export type SwitchKey = "mirror" | "polar";

/**
 * One complete state of the instrument. Palette = cosine palette a + b·cos(2π(c·t + d)),
 * flattened as [a.rgb, b.rgb, c.rgb, d.rgb].
 */
export type Patch = Record<ParamKey, number> &
  Record<SwitchKey, boolean> & {
    palette: number[];
  };

export interface FieldPreset {
  name: string;
  /** one dry line on what it looks like */
  note: string;
  patch: Patch;
}

export interface PatchNote {
  version: string;
  /** "2025-03-02" */
  date: string;
  /** "+ added", "~ changed", "- removed" lines */
  changes: string[];
  /** what the field looked like on that firmware: applied over the visitor's patch when loaded */
  build: Partial<Patch>;
}

export type StageId = "uniforms" | "noise" | "warp" | "palette" | "feedback" | "crush" | "output";

export interface FlowStage {
  id: StageId;
  label: string;
  /** tiny spec line under the module — "fbm × 7 octaves" */
  spec: string;
  note: string;
  /** names from project.technologies that power this stage */
  tech: string[];
}

export interface MeterScale {
  /** full scale of the dial */
  max: number;
  /** labelled ticks along the arc */
  ticks: number[];
  /** the red zone starts here */
  red: number;
}

export interface LabScene {
  /** hardware model printed on the panel */
  model: string;
  serial: string;
  /** factory bank — keys 1–8 */
  presets: FieldPreset[];
  /** REC names a saved patch "<adjective> <noun> <nnn>" */
  names: { adjectives: string[]; nouns: string[] };
  /** challenge / solution / outcome beats: a lead word and what each one does to the live field */
  story: { lead: string; tweak: Partial<Record<ParamKey, number>> }[];
  /** one per project.process step, same order */
  patchNotes: PatchNote[];
  flow: FlowStage[];
  /** one per project.metric, same order */
  meters: MeterScale[];
}
