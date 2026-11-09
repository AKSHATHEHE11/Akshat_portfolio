// Scene content for the "fashion" world (Fybr8). Filled in data/projects/fybr8.ts.
// Everything the lookbook, the store and the fit finder show comes from here.

export type GarmentKind = "jacket" | "denim-jacket" | "tee" | "trousers" | "cargo";
export type Category = "jackets" | "tees" | "denim";
/** Weaves the procedural fabric generator can draw. */
export type Weave = "twill-3x1" | "twill-2x1" | "canvas" | "jersey";

export interface Colourway {
  name: string;
  /** warp / dye colour */
  hex: string;
  /** weft colour for woven fabrics (defaults to undyed ecru) */
  weft?: string;
}

export interface SizeStock {
  label: string;
  /** 0 = sold out */
  stock: number;
}

export interface Fabric {
  /** weight in oz per square yard */
  oz: number;
  weave: Weave;
  /** human name of the weave, e.g. "3×1 right-hand twill" */
  weaveName: string;
  /** mechanical stretch in % (0 = rigid) */
  stretch: number;
  composition: string;
  /** one dry line about how it feels and ages */
  hand: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  kind: GarmentKind;
  category: Category;
  /** price in the scene currency, whole units */
  price: number;
  colours: Colourway[];
  sizes: SizeStock[];
  fabric: Fabric;
  note: string;
  /** trouser silhouette: 0 = tapered … 1 = wide */
  leg?: number;
  /** tees: chest pocket */
  pocket?: boolean;
  badge?: string;
  /** denim: which entry of scene.fits this product is cut to */
  fitId?: string;
  /** optional real product photo — the SVG garment is drawn when absent */
  image?: string;
}

export interface FitSize {
  label: string;
  /** garment waist, inches around (laid flat, doubled) */
  waist: number;
  /** thigh 1 in below the crotch, inches, laid flat edge to edge */
  thigh: number;
}

export interface Fit {
  id: string;
  name: string;
  productId: string;
  /** stock inseam, inches */
  inseam: number;
  /** silhouette 0 = tapered … 1 = wide (drawn by the fit finder) */
  leg: number;
  note: string;
  sizes: FitSize[];
}

export interface LookItem {
  productId: string;
  /** index into the product's colours */
  colour: number;
}

export interface Look {
  id: string;
  title: string;
  note: string;
  /** backdrop colour of the spread */
  backdrop: string;
  /** one oversized word that runs behind the garments */
  word: string;
  items: LookItem[];
}

export interface CoverLine {
  lead: string;
  text: string;
  target: "lookbook" | "preview" | "fit" | "process" | "outcome";
}

export interface FashionScene {
  issue: string;
  season: string;
  coverLines: CoverLine[];
  /** product ids hanging on the cover rack (top to bottom) */
  rack: string[];
  barcode: string;
  marquee: string[];
  lookbook: { title: string; line: string; looks: Look[] };
  store: {
    currency: string;
    locale: string;
    freeShippingOver: number;
    shippingFee: number;
    /** shown as a hint next to the store tabs */
    perks: string[];
  };
  products: Product[];
  fits: Fit[];
  fitGuide: { waist: string; inseam: string; thigh: string };
  checkout: {
    address: string;
    payment: string;
    delivery: string;
    orderPrefix: string;
    /** store median, compared with the visitor's own time */
    medianSeconds: number;
  };
  /** fabrics for the A/B swatches, one pair per decision */
  swatchbook: { a: Colourway; b: Colourway }[];
  /** the woven care label (technology) */
  label: { header: string[]; composition: string[]; footer: string[] };
}
