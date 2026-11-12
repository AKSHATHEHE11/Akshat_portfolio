// Scene content for the "railway" world (Safar Zaika). Filled in data/projects/safar-zaika.ts.

export interface Dish {
  id: string;
  name: string;
  /** Devanagari name */
  hi: string;
  kitchen: string;
  desc: string;
  /** rupees */
  price: number;
  veg: boolean;
  tag?: string;
}

export interface Station {
  code: string;
  en: string;
  hi: string;
  km: number;
  /** scheduled arrival "HH:MM" (null at the origin). Pass-through stations: the passing time. */
  arr: string | null;
  /** scheduled departure (null at the terminus) */
  dep: string | null;
  pf: number;
  kind: "origin" | "halt" | "pass" | "terminus";
  /** height above mean sea level, printed on the yellow station board */
  msl: number;
  /** the one thing the station is known for */
  famous?: string;
  /** delivery partner who meets the coach */
  partner?: string;
  menu?: Dish[];
}

export interface RailwayScene {
  /** the product's name in Devanagari, set under the title like a station board */
  nameHi: string;
  train: {
    no: string;
    name: string;
    hi: string;
    /** running late by (minutes) when the visitor opens the app */
    lateMin: number;
    /** coach order from the locomotive back — drives the platform diagram */
    consist: string[];
  };
  /** prefilled PNR */
  pnr: string;
  /** simulated clock when the app opens */
  now: string;
  /** kitchens need this long before the train reaches the platform */
  leadMin: number;
  deliveryFee: number;
  /** the Indian Railways PA opener, used for the story announcements */
  announce: { hi: string; en: string };
  /** what the PA announces during the ride, one per leg: how the order reaches the seat */
  story: { lead: string; text: string }[];
  route: Station[];
}
