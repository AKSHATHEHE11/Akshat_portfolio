// The playground keycap — one sculpted Cherry-profile (R3) cap, hollow, with an MX stem underneath.
//   node scripts/models/keycap.mjs   →  public/models/keycap.glb
//
// Named parts the site uses (components/playground/keycap/Scene.tsx):
//   keycap         group, pivot at the base centre (the press travels along local −Y)
//   cap            the PBT shell: outer surface + bottom rim + inner cavity + MX stem
//   legend_plate   a thin sheet on the dish (UV 0..1, texture "up" = toward the back, −Z);
//                  the site draws the legend onto it at runtime with a CanvasTexture
// Units: 1 = 10 mm. Footprint 1.8 × 1.8 (1u), front +Z. The top tilts toward the typist (+Z).
import { THREE, exportGLB, mat } from './lib/export.mjs';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const BASE = { hw: 0.9, hd: 0.9, rc: 0.09 };
const TOP = { hw: 0.625, hd: 0.66, rc: 0.24 };
const H_FRONT = 0.74; // top height at the front edge
const H_BACK = 0.88; // …and at the back edge: the sculpt
const FILLET = 0.1;
const DISH = 0.07; // cylindrical dish depth (curves across X)
const WALL = 0.12; // shell thickness
const PER = 9; // points per corner arc
const EDGE = 9; // points along each straight edge (the dish curves across them)

/** Height of the (undished) top plane at depth z. */
const plane = (z) => H_BACK + ((H_FRONT - H_BACK) * (z + TOP.hd)) / (2 * TOP.hd);
/** Dish: a cylinder across X, fading in over the fillet so the rim stays crisp. */
const dish = (x, wgt) => DISH * (1 - Math.min(1, (x / TOP.hw) ** 2)) * wgt;
/** The finished top surface (used to conform the legend plate). */
const surface = (x, z) => plane(z) - dish(x, 1);

/** Points [x, z] around a rounded rectangle, angle increasing from +X toward +Z; same count for every ring. */
function ring(hw, hd, rc) {
  const pts = [];
  const corners = [
    [hw - rc, hd - rc, 0],
    [-(hw - rc), hd - rc, Math.PI / 2],
    [-(hw - rc), -(hd - rc), Math.PI],
    [hw - rc, -(hd - rc), Math.PI * 1.5],
  ];
  const arcs = corners.map(([cx, cz, a0]) =>
    Array.from({ length: PER }, (_, k) => {
      const a = a0 + (k / (PER - 1)) * (Math.PI / 2);
      return [cx + Math.cos(a) * rc, cz + Math.sin(a) * rc];
    }),
  );
  arcs.forEach((arc, i) => {
    pts.push(...arc);
    const [ex, ez] = arc[PER - 1];
    const [nx, nz] = arcs[(i + 1) % 4][0];
    for (let s = 1; s <= EDGE; s++) pts.push([lerp(ex, nx, s / (EDGE + 1)), lerp(ez, nz, s / (EDGE + 1))]);
  });
  return pts;
}

/**
 * Stitch rings (each a list of [x,y,z], every next ring further along the surface) into one indexed
 * mesh. Faces point "outward" (away from the axis for walls, up for a top cap); `flip` reverses them.
 */
function loft(rings, { cap = null, flip = false } = {}) {
  const P = rings[0].length;
  const pos = rings.flat().flat();
  const idx = [];
  for (let i = 0; i < rings.length - 1; i++)
    for (let j = 0; j < P; j++) {
      const a = i * P + j, b = i * P + ((j + 1) % P), c = (i + 1) * P + j, d = (i + 1) * P + ((j + 1) % P);
      if (flip) idx.push(a, b, d, a, d, c);
      else idx.push(a, d, b, a, c, d);
    }
  if (cap) {
    const centre = pos.length / 3;
    pos.push(...cap);
    const last = (rings.length - 1) * P;
    for (let j = 0; j < P; j++) {
      if (flip) idx.push(last + j, last + ((j + 1) % P), centre);
      else idx.push(last + j, centre, last + ((j + 1) % P));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const lerp = (a, b, t) => a + (b - a) * t;

/* ── outer shell: tapered walls → fillet → dished top ─────────────────────── */
const outerRings = [];
{
  // walls: base → the start of the fillet. Wall rings take their height from the sculpted plane.
  for (const t of [0, 0.34, 0.68, 1]) {
    const hw = lerp(BASE.hw, TOP.hw, t), hd = lerp(BASE.hd, TOP.hd, t), rc = lerp(BASE.rc, TOP.rc, t);
    outerRings.push(ring(hw, hd, rc).map(([x, z]) => [x, t * (plane(Math.max(-TOP.hd, Math.min(TOP.hd, z))) - FILLET), z]));
  }
  // fillet: a quarter round from the wall into the top
  for (let i = 1; i <= 5; i++) {
    const a = (i / 5) * (Math.PI / 2);
    const inset = FILLET * (1 - Math.cos(a));
    const wgt = Math.sin(a) ** 2;
    outerRings.push(
      ring(TOP.hw - inset, TOP.hd - inset, Math.max(0.05, TOP.rc - inset)).map(([x, z]) => [
        x,
        plane(z) - FILLET + FILLET * Math.sin(a) - dish(x, wgt),
        z,
      ]),
    );
  }
  // the dish itself, shrinking toward the centre so the curve has resolution
  for (const s of [0.82, 0.62, 0.42, 0.22]) {
    const hw = (TOP.hw - FILLET) * s, hd = (TOP.hd - FILLET) * s;
    outerRings.push(ring(hw, hd, Math.max(0.01, (TOP.rc - FILLET) * s)).map(([x, z]) => [x, surface(x, z), z]));
  }
}
const outer = loft(outerRings, { cap: [0, surface(0, 0), 0] });

/* ── inner cavity: the same taper, one wall thickness in, with a flat ceiling ─ */
const CEIL = H_FRONT - DISH - WALL * 1.15;
const innerAt = (y) => {
  const t = Math.min(1, y / (H_FRONT - FILLET));
  return { hw: lerp(BASE.hw, TOP.hw, t) - WALL, hd: lerp(BASE.hd, TOP.hd, t) - WALL, rc: Math.max(0.03, lerp(BASE.rc, TOP.rc, t) - WALL * 0.6) };
};
const innerRings = [0, CEIL * 0.5, CEIL].map((y) => {
  const r = innerAt(y);
  return ring(r.hw, r.hd, r.rc).map(([x, z]) => [x, y, z]);
});
const inner = loft(innerRings, { cap: [0, CEIL, 0], flip: true });

/* ── bottom rim: the flat annulus you see when the cap is turned over ─────── */
const rim = loft([outerRings[0], innerRings[0]], { flip: true });

/* ── MX stem: a round post with the cross socket ──────────────────────────── */
const stem = (() => {
  const s = new THREE.Shape();
  s.absarc(0, 0, 0.275, 0, Math.PI * 2, false);
  const L = 0.2, W = 0.0585; // 4.0 × 1.17 mm cross
  const hole = new THREE.Path();
  [
    [W, L], [-W, L], [-W, W], [-L, W], [-L, -W], [-W, -W],
    [-W, -L], [W, -L], [W, -W], [L, -W], [L, W], [W, W],
  ].forEach(([x, y], i) => (i ? hole.lineTo(x, y) : hole.moveTo(x, y)));
  hole.closePath();
  s.holes.push(hole);
  const depth = CEIL - 0.05;
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 28 });
  g.rotateX(Math.PI / 2); // extrude along −Y
  g.translate(0, CEIL, 0);
  return g;
})();

/** position + normal only, indexed (hard edges survive: welding only joins identical normals). */
function bare(g) {
  if (g.attributes.uv) g.deleteAttribute('uv');
  return g.index ? g : mergeVertices(g, 1e-5);
}
const capGeo = mergeGeometries([outer, inner, rim, stem].map(bare));

/* ── legend plate: a UV'd sheet that follows the dish ─────────────────────── */
const plate = new THREE.PlaneGeometry((TOP.hw - FILLET) * 1.7, (TOP.hd - FILLET) * 1.7, 24, 24);
plate.rotateX(-Math.PI / 2); // faces +Y; texture "up" now points to −Z (the back of the key)
{
  const p = plate.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, surface(p.getX(i), p.getZ(i)) + 0.006);
  plate.computeVertexNormals();
}

const M = {
  pbt: mat('#ece5d8', { roughness: 0.66, name: 'pbt' }),
  legend: mat('#111111', { roughness: 0.6, transparent: true, opacity: 1, name: 'legend' }),
};

const group = new THREE.Group();
group.name = 'keycap';
const cap = new THREE.Mesh(capGeo, M.pbt);
cap.name = 'cap';
const legend = new THREE.Mesh(plate, M.legend);
legend.name = 'legend_plate';
group.add(cap, legend);

const scene = new THREE.Scene();
scene.add(group);
await exportGLB(scene, 'keycap');
