// Scene content for the "command-center" world (DecisionOS): the board, the map, the scripted
// sessions and the extra copy each part of the room needs. Filled in data/projects/decisionos.ts.

export type AgentId = "ceo" | "cfo" | "coo" | "cmo";
export type Stance = "for" | "against" | "conditional";

export interface BoardAgent {
  id: AgentId;
  /** "CFO" */
  role: string;
  /** what the seat is for — "Money" */
  seat: string;
  /** the metric this agent is judged on */
  judgedOn: string;
  /** live KPI on the panel while the board is idle; series = bar heights 0..1 */
  kpi: { label: string; value: string; series: number[] };
  /** chaos mode: what this agent shouts when the board loses order */
  heckles: string[];
}

export interface City {
  id: string;
  name: string;
  lon: number;
  lat: number;
}

export interface AgentTake {
  stance: Stance;
  /** 0–100 */
  confidence: number;
  /** streamed into the agent's panel */
  quote: string;
  /** the numbers the agent puts on the table */
  cites: string[];
  objection: string;
  /** city ids the agent points the globe at */
  regions: string[];
}

export interface Scenario {
  id: string;
  prompt: string;
  /** free-typed questions go to the scenario whose keywords they hit most */
  keywords: string[];
  /** [lon, lat] the globe turns to */
  focus: [number, number];
  takes: Record<AgentId, AgentTake>;
  brief: {
    verdict: string;
    recommendation: string;
    facts: { label: string; value: string }[];
    dissent: { agent: AgentId; quote: string };
  };
}

export interface CommandCenterScene {
  /** suffix of the title drawn as hollow hologram letters ("OS") */
  titleAccent: string;
  room: {
    code: string;
    client: string;
    clientLine: string;
    /** city id of the client's HQ — every arc starts here */
    hq: string;
    date: string;
    briefNo: string;
  };
  agents: BoardAgent[];
  cities: City[];
  scenarios: Scenario[];
  /** stamps for challenge / solution / outcome, in that order */
  minutes: { stamp: string; label: string }[];
  /** one entry per project.process step, same order */
  missionLog: { stamp: string; code: string; artefact: string }[];
  missionStatus: string;
  /** technology diagram: node positions on a 4×3 grid (x 0..3, y 0..2) and the wires between them */
  wiring: { nodes: { name: string; x: number; y: number }[]; links: [string, string][] };
}
