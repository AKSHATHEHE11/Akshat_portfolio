// Scene content for the "blueprint" world (Synthora SID). Filled in data/projects/synthora-sid.ts.
// The campus plan is in metres; the walk router measures routes on it.

export type BuildingId = "A" | "B" | "AD" | "H" | "L" | "C" | "AU" | "SG";

export interface Building {
  id: BuildingId;
  name: string;
  /** what happens inside, one line */
  use: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** walk-graph node at the entrance */
  door: string;
  /** drawn as an oval (sports ground) */
  oval?: boolean;
}

export interface Campus {
  /** plan extents, metres */
  w: number;
  h: number;
  buildings: Building[];
  /** walkway junctions + doors */
  nodes: { id: string; x: number; y: number }[];
  /** walkways between node ids */
  paths: [string, string][];
  gate: string;
  /** where the student is standing when the app opens */
  you: { node: string; label: string };
  /** metres per minute */
  walk: number;
}

export interface Subject {
  code: string;
  short: string;
  name: string;
  faculty: string;
  /** classes held so far / attended / planned for the whole semester */
  held: number;
  attended: number;
  planned: number;
  /** internal assessment, out of `internalMax` in total */
  internals: { label: string; got: number; of: number }[];
}

export interface Slot {
  /** 0 = Mon */
  day: number;
  start: string;
  end: string;
  /** Subject.short */
  subject: string;
  kind: "Lecture" | "Lab" | "Tutorial";
  /** "B-204" → building B */
  room: string;
}

export interface Fee {
  id: string;
  label: string;
  detail: string;
  amount: number;
  due: string;
  status: "paid" | "due" | "overdue";
  paidOn?: string;
  ref?: string;
}

export type AppTab = "today" | "attendance" | "week" | "id" | "records";

/** A spec note drawn beside the device: `at` is how far down the screen its leader lands (0–1). */
export interface Callout {
  text: string;
  at: number;
}

/** Areas of the app wireframe that revision clouds and detail callouts point at. */
export type Area = "login" | "next" | "plan" | "margin" | "list" | "tabs";

export interface BlueprintScene {
  /** the drawing's title block */
  sheet: {
    client: string;
    drawnBy: string;
    checkedBy: string;
    scale: string;
    number: string;
  };
  institute: { name: string; short: string; city: string };
  student: {
    name: string;
    first: string;
    initials: string;
    roll: string;
    programme: string;
    semester: string;
    batch: string;
    blood: string;
    validTill: string;
    library: string;
    hostel: string;
  };
  /** the simulated moment the app opens at */
  now: { day: number; time: string; date: string; week: string; synced: string };
  days: string[];
  /** minimum attendance at semester end, 0–1 */
  minAttendance: number;
  campus: Campus;
  subjects: Subject[];
  week: Slot[];
  grades: {
    history: { sem: string; sgpa: number }[];
    /** end-semester exam is out of this; internals make up the rest of 100 */
    endSemMax: number;
    /** below this in the end-sem you fail regardless of internals */
    endSemPass: number;
    bands: { grade: string; min: number }[];
  };
  fees: Fee[];
  /** the five systems students had before (story: existing → proposed → as built) */
  portals: { name: string; does: string; retired?: boolean }[];
  /** aligned with project.process: revision letter, date, initials, area of the app it changed */
  revisions: { date: string; by: string; area: Area }[];
  /** aligned with project.decisions: where each detail callout sits on the key plan */
  details: { area: Area }[];
  callouts: Record<AppTab, Callout[]>;
}
