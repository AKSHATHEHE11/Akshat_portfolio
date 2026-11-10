// SAMPLE stand-ins for the /design fields, so the layouts can be seen and built before Akshat's files
// arrive. Dev server only: production builds never use them, and their media (public/design/_samples)
// is gitignored, generated locally, and labelled SAMPLE on every frame.
import type { Field, FieldId, Work } from "./design";
import { works } from "./design";

const S = "/design/_samples";
const v = (name: string, w = 1280, h = 720) => ({ kind: "video" as const, src: `${S}/${name}.mp4`, poster: `${S}/${name}.jpg`, width: w, height: h });
const img = (name: string, width: number, height: number) => ({ kind: "image" as const, src: `${S}/${name}.jpg`, width, height });

// empty in production builds, so the stand-ins never reach the live bundle
export const samples: Work[] = process.env.NODE_ENV === "production" ? [] : [
  { id: "sample-edit-01", field: "edits", title: "Sample edit one", meta: "Client · Reel · 2026", media: v("edit-01"), preview: v("edit-01-preview", 640, 360) },
  { id: "sample-edit-02", field: "edits", title: "Sample edit two", meta: "Brand promo · 2025", media: v("edit-02"), preview: v("edit-02-preview", 640, 360) },
  { id: "sample-edit-03", field: "edits", title: "Sample edit three", meta: "Music video · 2025", media: v("edit-03"), preview: v("edit-03-preview", 640, 360) },
  { id: "sample-poster-01", field: "posters", title: "Sample poster one", meta: "Event · 2026", media: img("poster-01", 1080, 1350) },
  { id: "sample-poster-02", field: "posters", title: "Sample poster two", meta: "Gig poster · 2025", media: img("poster-02", 1080, 1620) },
  { id: "sample-poster-03", field: "posters", title: "Sample poster three", meta: "Cover · 2025", media: img("poster-03", 1191, 1684) },
  { id: "sample-poster-04", field: "posters", title: "Sample poster four", meta: "Social · 2025", media: img("poster-04", 1080, 1350) },
  { id: "sample-poster-05", field: "posters", title: "Sample poster five", meta: "Event · 2024", media: img("poster-05", 1080, 1620) },
  { id: "sample-poster-06", field: "posters", title: "Sample poster six", meta: "Festival · 2024", media: img("poster-06", 1191, 1684) },
  { id: "sample-render-01", field: "three-d", title: "Sample render one", meta: "Product · 2026", media: img("render-01", 1200, 1200), preview: v("render-01-turn", 720, 720) },
  { id: "sample-render-02", field: "three-d", title: "Sample render two", meta: "Scene · 2025", media: img("render-02", 1200, 1200) },
  { id: "sample-render-03", field: "three-d", title: "Sample render three", meta: "Object · 2025", media: img("render-03", 1200, 1200) },
  { id: "sample-render-04", field: "three-d", title: "Sample render four", meta: "Study · 2024", media: img("render-04", 1200, 1200) },
  { id: "sample-visual-01", field: "visuals", title: "Sample loop one", meta: "Headline set · Stage left · 2026", media: v("visual-01") },
  { id: "sample-visual-02", field: "visuals", title: "Sample loop two", meta: "Festival main stage · 2025", media: v("visual-02") },
  { id: "sample-visual-03", field: "visuals", title: "Sample loop three", meta: "Club night · 2025", media: v("visual-03") },
];

/** The works a field shows: Akshat's own, or (dev server only, while a field has none) the samples. */
export function worksFor(id: FieldId): Work[] {
  const own = works.filter((w) => w.field === id);
  return own.length ? own : samples.filter((w) => w.field === id);
}

/** The fields that have something to show, in page order. */
export function liveFields(fields: readonly Field[]): Field[] {
  return fields.filter((f) => worksFor(f.id).length > 0);
}
