// Timetable maths for the railway world. Pure functions, minutes since midnight everywhere.
import { clamp, pad } from "@/lib/utils";
import type { Station } from "./scene";

export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export const fmt = (min: number) => {
  const m = ((Math.floor(min) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
};

export const isStop = (s: Station) => s.kind !== "pass";
export const arrOf = (s: Station) => toMin(s.arr ?? s.dep ?? "00:00");
export const haltOf = (s: Station) => (s.arr && s.dep ? toMin(s.dep) - toMin(s.arr) : 0);

/** 0 at the origin's departure → 1 at the terminus. Drives the sky (morning → dusk). */
export function dayT(route: Station[], min: number) {
  const a = toMin(route[0].dep ?? "08:00");
  const b = arrOf(route[route.length - 1]);
  return clamp((min - a) / (b - a));
}

/** Where the train is (km) at a minute, given it runs `late` minutes behind the timetable. */
export function kmAt(route: Station[], min: number, late: number) {
  const pts: [number, number][] = [];
  for (const s of route) {
    if (s.arr) pts.push([toMin(s.arr) + late, s.km]);
    if (s.dep && s.dep !== s.arr) pts.push([toMin(s.dep) + late, s.km]);
  }
  if (min <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [t1, k1] = pts[i];
    if (min <= t1) {
      const [t0, k0] = pts[i - 1];
      return t1 === t0 ? k1 : k0 + ((k1 - k0) * (min - t0)) / (t1 - t0);
    }
  }
  return pts[pts.length - 1][1];
}

export interface Reach {
  ok: boolean;
  why: string;
  eta: number;
  orderBy: number;
}

/** Can a kitchen at this station still reach the coach? Only reachable halts are orderable. */
export function reach(s: Station, now: number, late: number, lead: number): Reach {
  const eta = arrOf(s) + late;
  const orderBy = eta - lead;
  if (s.kind === "origin" || eta <= now) return { ok: false, why: "Departed", eta, orderBy };
  if (s.kind === "pass") return { ok: false, why: "No halt", eta, orderBy };
  if (now > orderBy) return { ok: false, why: `Closed — kitchens need ${lead} min`, eta, orderBy };
  return { ok: true, why: `Order by ${fmt(orderBy)}`, eta, orderBy };
}

const BERTHS = ["Lower", "Middle", "Upper", "Lower", "Middle", "Upper", "Side lower", "Side upper"];

/** Demo PRS lookup: coach and berth are derived from the PNR digits, so every PNR feels real. */
export function readPnr(pnr: string, consist: string[]) {
  const coaches = consist.filter((c) => /^[SBA]\d/.test(c));
  const sum = [...pnr].reduce((a, c) => a + Number(c), 0);
  const seat = Number(pnr.slice(-2)) % 72 || 72;
  return { coach: coaches[sum % coaches.length], seat, berth: BERTHS[(seat - 1) % 8] };
}
export type Trip = ReturnType<typeof readPnr>;

/**
 * Scroll-journey geometry. Distances are in "window widths" (W): the nearest landscape layer
 * moves one window width per unit. Legs are compressed so a 440 km leg is not 4× a 130 km one.
 */
export function routeGeo(route: Station[]) {
  const stops = route.filter(isStop);
  const legs = stops.slice(1).map((s, i) => s.km - stops[i].km);
  const max = Math.max(...legs);
  const D = [0];
  legs.forEach((k) => D.push(D[D.length - 1] + 4 + 5 * (k / max)));
  const dAtKm = (km: number) => {
    for (let i = 1; i < stops.length; i++) {
      if (km <= stops[i].km) return D[i - 1] + ((km - stops[i - 1].km) / (stops[i].km - stops[i - 1].km)) * (D[i] - D[i - 1]);
    }
    return D[D.length - 1];
  };
  const minors = route.filter((s) => !isStop(s)).map((s) => ({ D: dAtKm(s.km), station: s }));
  /** timetable clock and km at a journey distance (halts collapse to the arrival time) */
  const at = (d: number) => {
    for (let i = 1; i < stops.length; i++) {
      if (d <= D[i]) {
        const f = (d - D[i - 1]) / (D[i] - D[i - 1]);
        const from = toMin(stops[i - 1].dep ?? stops[i - 1].arr ?? "00:00");
        return {
          clock: from + f * (arrOf(stops[i]) - from),
          km: stops[i - 1].km + f * (stops[i].km - stops[i - 1].km),
        };
      }
    }
    const last = stops[stops.length - 1];
    return { clock: arrOf(last), km: last.km };
  };
  return { stops, D, minors, at };
}
export type RouteGeo = ReturnType<typeof routeGeo>;
