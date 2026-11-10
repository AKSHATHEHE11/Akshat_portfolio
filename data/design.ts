// Akshat's design portfolio (/design). The roles and likes are his, from his Behance cover (PORTFOLIO).
// The line under each field is DUMMY in the right shape — replace with his own words. The photo is cut
// from that cover; a sharper original can replace public/design/akshat.webp at the same size ratio.
//
// HOW WORK GETS ON THE PAGE: add an entry to `works` below, with its files under public/design/work/<field>/.
// A field shows on the live site as soon as it has one work. Until then the live page skips it, and the
// dev server (npm run dev) fills it with the SAMPLE stand-ins from data/design-samples.ts instead.

/** What a piece shows. Video files are compressed MP4s in /public; long edits can live on YouTube. */
export type Media =
  | { kind: "image"; src: string; width: number; height: number }
  | { kind: "video"; src: string; poster: string; width: number; height: number }
  | { kind: "youtube"; id: string; poster: string; width: number; height: number };

export type VideoMedia = Extract<Media, { kind: "video" }>;

export type FieldId = "edits" | "posters" | "three-d" | "visuals";

export interface Work {
  /** unique and url-safe, e.g. "lollapalooza-intro" */
  id: string;
  field: FieldId;
  title: string;
  /** one line under the title: client · event · year */
  meta?: string;
  /** what the lightbox (or, for concert visuals, the stage screen) shows */
  media: Media;
  /** optional short muted loop that plays on hover (edit teasers, 3D turntables) */
  preview?: VideoMedia;
  /** what an image shows, for screen readers; defaults to the title */
  alt?: string;
}

export interface Field {
  id: FieldId;
  title: string;
  /** the hand-written accent after the title */
  script: string;
  line: string;
}

export const design = {
  iAm: ["Graphic designer", "Photo & video editor", "3D designer"],
  iLike: ["Music", "Comedy", "Games"],
  photo: {
    src: "/design/akshat.webp",
    width: 960,
    height: 642,
    alt: "Akshat Agrawal in black and white, glasses on, looking off to the side",
  },
  kicker: "What I do with pixels",
  /** the kinds of work, in page order */
  fields: [
    { id: "edits", title: "Video edits", script: "cut to the beat", line: "Reels, promos and music edits: pacing, colour and sound that land together." },
    { id: "posters", title: "Posters", script: "type first", line: "Event posters, covers and social graphics." },
    { id: "three-d", title: "3D designs", script: "from every side", line: "Objects, scenes and light, rendered to be looked at from every side." },
    { id: "visuals", title: "Concert visuals", script: "made for the big screen", line: "Loops and graphics that play on the LED walls behind artists on stage." },
  ] satisfies Field[],
  behance: {
    href: "https://www.behance.net/gallery/205615917/PORTFOLIO",
    label: "Behance · Portfolio",
    title: ["The full portfolio", "lives on Behance."],
    cta: "Open on Behance",
    /** the key in the sticky field index */
    short: "Behance",
  },
  cta: {
    title: ["Need a designer", "who also ships?"],
    line: "I design it, edit it, model it, and build the thing it goes into. Leave your name, email and number and I’ll get back to you.",
    button: "Work with me",
  },
} as const;

/** Akshat's pieces, in the order they should appear within their field. Empty until his files arrive. */
export const works: Work[] = [];
