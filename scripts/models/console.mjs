// The hero console — a cream retro lab device with a CRT, a tuning knob, a chaos switch and four keys.
//   node scripts/models/console.mjs   →  public/models/console.glb
//
// Named parts the site animates (components/hero/console/*):
//   screen                      curved CRT glass — the site draws a CanvasTexture onto it (UV 0..1, upright)
//   knob                        group, pivot at its centre on the face, rotates around local Z
//   switch / switch_lever       slide toggle; the lever group slides along local X (off −0.085 → on +0.085)
//   key_design|code|experiment|play   keycap groups, pivot at the base centre, travel along local Z
//   socket                      group at the mouth of the cable socket (the runtime cable starts here)
//   led                         status LED next to the switch (material "led", emissive driven at runtime)
// The front face is the plane z = +0.31; the body is 2.2 × 1.6 × 0.62, centred on the origin.
// Keep in sync with LAYOUT in components/hero/console/rig.ts (the SVG fallback + fallback hit areas).
import { THREE, exportGLB, mat } from './lib/export.mjs';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const FACE = 0.31;

const M = {
  cream: mat('#e8e0d0', { roughness: 0.5, clearcoat: 0.3, name: 'cream' }),
  keycap: mat('#f0e9dc', { roughness: 0.68, name: 'keycap' }),
  rubber: mat('#1c1a18', { roughness: 0.85, name: 'rubber' }),
  orange: mat('#ff5a1f', { roughness: 0.4, clearcoat: 0.55, name: 'orange' }),
  ink: mat('#1a1815', { roughness: 0.6, name: 'ink' }),
  metal: mat('#8f8b83', { roughness: 0.34, metalness: 0.85, name: 'metal' }),
  glass: mat('#0b0a09', { roughness: 0.12, clearcoat: 1, name: 'glass' }),
  led: mat('#2b1408', { roughness: 0.3, emissive: '#ff5a1f', emissiveIntensity: 0, name: 'led' }),
};

/* ── geometry helpers ─────────────────────────────────────────────────────── */

/** Drop UVs and weld duplicates (keeps hard edges where normals differ). */
function lean(g) {
  if (g.index === null || g.attributes.uv) {
    g.deleteAttribute('uv');
    g = mergeVertices(g, 1e-5);
  }
  return g;
}
/** Weld by position only and rebuild smooth normals (soft bevels, lathe surfaces). */
function smooth(g) {
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  g = mergeVertices(g, 1e-5);
  g.computeVertexNormals();
  return g;
}
function merge(list) {
  return mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)).map((g) => {
    g.deleteAttribute('uv');
    return g;
  }));
}
/** Rounded rectangle path (centred), true circular corners. */
function rrect(p, w, h, r) {
  const hw = w / 2, hh = h / 2;
  p.moveTo(-hw + r, -hh);
  p.lineTo(hw - r, -hh);
  p.absarc(hw - r, -hh + r, r, -Math.PI / 2, 0, false);
  p.lineTo(hw, hh - r);
  p.absarc(hw - r, hh - r, r, 0, Math.PI / 2, false);
  p.lineTo(-hw + r, hh);
  p.absarc(-hw + r, hh - r, r, Math.PI / 2, Math.PI, false);
  p.lineTo(-hw, -hh + r);
  p.absarc(-hw + r, -hh + r, r, Math.PI, Math.PI * 1.5, false);
  return p;
}
function mesh(geo, material, name) {
  const m = new THREE.Mesh(geo, material);
  if (name) m.name = name;
  return m;
}
/** A flat stroke segment (for raised legends): box from a to b, width w, height t. */
function seg(ax, ay, bx, by, w, t) {
  const len = Math.hypot(bx - ax, by - ay);
  const g = new THREE.BoxGeometry(len + w * 0.9, w, t);
  g.rotateZ(Math.atan2(by - ay, bx - ax));
  g.translate((ax + bx) / 2, (ay + by) / 2, t / 2);
  return g;
}

/* ── body ─────────────────────────────────────────────────────────────────── */
const root = new THREE.Group();
root.name = 'console';

{
  const shape = rrect(new THREE.Shape(), 2.08, 1.48, 0.22);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: 0.5,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.06,
    bevelSegments: 5,
    curveSegments: 10,
  });
  g.translate(0, 0, -0.25);
  root.add(mesh(smooth(g), M.cream, 'body'));
}

/* ── CRT: bezel, gasket, curved glass ─────────────────────────────────────── */
const SCREEN = { x: -0.26, y: 0.2 };
{
  const ring = rrect(new THREE.Shape(), 1.22, 0.88, 0.15);
  ring.holes.push(rrect(new THREE.Path(), 1.04, 0.7, 0.1));
  const g = new THREE.ExtrudeGeometry(ring, {
    depth: 0.02,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.028,
    bevelSegments: 4,
    curveSegments: 8,
  });
  g.translate(SCREEN.x, SCREEN.y, FACE);
  root.add(mesh(smooth(g), M.cream, 'bezel'));

  const gasket = rrect(new THREE.Shape(), 1.08, 0.74, 0.12);
  gasket.holes.push(rrect(new THREE.Path(), 0.94, 0.62, 0.07));
  const gg = new THREE.ShapeGeometry(gasket, 8);
  gg.translate(SCREEN.x, SCREEN.y, FACE + 0.022);
  root.add(mesh(lean(gg), M.rubber, 'gasket'));

  // Pillow-curved glass, 0.97 × 0.66 (aspect 1.47 — the screen canvas is 720 × 490).
  const W = 0.97, H = 0.66;
  const glass = new THREE.PlaneGeometry(W, H, 36, 24);
  const p = glass.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / (W / 2), y = p.getY(i) / (H / 2);
    p.setZ(i, 0.008 + 0.024 * (1 - x * x * 0.85) * (1 - y * y * 0.85));
  }
  glass.computeVertexNormals();
  glass.translate(SCREEN.x, SCREEN.y, FACE);
  root.add(mesh(glass, M.glass, 'screen'));
}

/* ── knob + tick ring ─────────────────────────────────────────────────────── */
const KNOB = { x: 0.7, y: 0.38 };
{
  const ticks = [];
  for (let i = 0; i <= 10; i++) {
    const a = (-135 + i * 27) * (Math.PI / 180); // 0 = up, clockwise positive
    const long = i === 0 || i === 5 || i === 10;
    const r0 = 0.222, r1 = long ? 0.262 : 0.25;
    const g = new THREE.BoxGeometry(0.012, r1 - r0, 0.004);
    g.translate(0, (r0 + r1) / 2, 0.002);
    g.rotateZ(-a);
    g.translate(KNOB.x, KNOB.y, FACE);
    ticks.push(g);
  }
  root.add(mesh(lean(merge(ticks)), M.ink, 'knob_ticks'));

  const knob = new THREE.Group();
  knob.name = 'knob';
  knob.position.set(KNOB.x, KNOB.y, FACE);

  const skirt = new THREE.CylinderGeometry(0.188, 0.198, 0.03, 48);
  skirt.rotateX(Math.PI / 2);
  skirt.translate(0, 0, 0.015);
  knob.add(mesh(smooth(skirt), M.rubber, 'knob_skirt'));

  // Lathe profile (r, height), listed bottom → top so the faces point outward.
  const prof = [
    [0.0, 0.168], [0.06, 0.167], [0.11, 0.163], [0.138, 0.156], [0.152, 0.145],
    [0.158, 0.13], [0.16, 0.085], [0.161, 0.04], [0.168, 0.03], [0.168, 0.028],
  ].reverse().map(([r, h]) => new THREE.Vector2(r, h));
  const lathe = new THREE.LatheGeometry(prof, 96);
  lathe.rotateX(Math.PI / 2);
  const lp = lathe.attributes.position;
  for (let i = 0; i < lp.count; i++) {
    const x = lp.getX(i), y = lp.getY(i), z = lp.getZ(i);
    const r = Math.hypot(x, y);
    if (r > 0.154 && z > 0.036 && z < 0.138) {
      const th = Math.atan2(y, x);
      const k = (r + 0.0065 * (0.5 + 0.5 * Math.cos(th * 32))) / r;
      lp.setXY(i, x * k, y * k);
    }
  }
  knob.add(mesh(smooth(lathe), M.orange, 'knob_cap'));

  const mark = new THREE.BoxGeometry(0.016, 0.07, 0.006);
  mark.translate(0, 0.088, 0.165);
  knob.add(mesh(lean(mark), M.ink, 'knob_mark'));
  root.add(knob);
}

/* ── chaos switch + LED ───────────────────────────────────────────────────── */
const SWITCH = { x: 0.73, y: -0.02 };
{
  const sw = new THREE.Group();
  sw.name = 'switch';
  sw.position.set(SWITCH.x, SWITCH.y, FACE);
  const housing = new RoundedBoxGeometry(0.36, 0.15, 0.05, 3, 0.035);
  sw.add(mesh(lean(housing), M.rubber, 'switch_housing'));
  const slot = new THREE.BoxGeometry(0.3, 0.03, 0.004);
  slot.translate(0, 0, 0.026);
  sw.add(mesh(lean(slot), M.ink, 'switch_slot'));

  const lever = new THREE.Group();
  lever.name = 'switch_lever';
  lever.position.set(-0.085, 0, 0.03);
  const body = new RoundedBoxGeometry(0.16, 0.112, 0.05, 3, 0.02);
  const ridges = [-0.032, 0, 0.032].map((x) => {
    const r = new THREE.BoxGeometry(0.011, 0.074, 0.012);
    r.translate(x, 0, 0.026);
    return r;
  });
  lever.add(mesh(lean(merge([body, ...ridges])), M.orange, 'switch_lever_cap'));
  sw.add(lever);

  // end marks: "0" side dot, "1" side bar
  const marks = [new THREE.CylinderGeometry(0.012, 0.012, 0.004, 12), new THREE.BoxGeometry(0.05, 0.012, 0.004)];
  marks[0].rotateX(Math.PI / 2);
  marks[0].translate(-0.215, 0, 0.002);
  marks[1].translate(0.225, 0, 0.002);
  const mk = lean(merge(marks));
  mk.translate(SWITCH.x, SWITCH.y, FACE);
  root.add(mesh(mk, M.ink, 'switch_marks'));
  root.add(sw);

  const ledRing = new THREE.TorusGeometry(0.03, 0.008, 8, 24);
  ledRing.translate(0.47, SWITCH.y, FACE + 0.004);
  root.add(mesh(lean(ledRing), M.ink, 'led_ring'));
  const led = new THREE.SphereGeometry(0.024, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  led.rotateX(Math.PI / 2);
  led.scale(1, 1, 0.6);
  led.translate(0.47, SWITCH.y, FACE);
  root.add(mesh(lean(led), M.led, 'led'));
}

/* ── speaker grille ───────────────────────────────────────────────────────── */
{
  const dots = [];
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) {
      const g = new THREE.CylinderGeometry(0.017, 0.017, 0.004, 12);
      g.rotateX(Math.PI / 2);
      g.translate(0.625 + c * 0.07, -0.315 - r * 0.07, FACE + 0.002);
      dots.push(g);
    }
  root.add(mesh(lean(merge(dots)), M.rubber, 'grille'));
}

/* ── screws ───────────────────────────────────────────────────────────────── */
{
  const heads = [], slots = [];
  const spots = [[-0.94, 0.64, 0.3], [0.94, 0.64, 1.1], [-0.94, -0.64, 2.2], [0.94, -0.64, 0.7]];
  for (const [x, y, rot] of spots) {
    const h = new THREE.CylinderGeometry(0.032, 0.035, 0.014, 20);
    h.rotateX(Math.PI / 2);
    h.translate(x, y, FACE + 0.007);
    heads.push(h);
    for (const a of [rot, rot + Math.PI / 2]) {
      const s = new THREE.BoxGeometry(0.042, 0.008, 0.004);
      s.rotateZ(a);
      s.translate(x, y, FACE + 0.0145);
      slots.push(s);
    }
  }
  root.add(mesh(lean(merge(heads)), M.metal, 'screws'));
  root.add(mesh(lean(merge(slots)), M.ink, 'screw_slots'));
}

/* ── cable socket on the top edge ─────────────────────────────────────────── */
{
  const socket = new THREE.Group();
  socket.name = 'socket';
  socket.position.set(0.8, 0.9, -0.04);
  const collar = new THREE.CylinderGeometry(0.07, 0.078, 0.035, 28);
  collar.translate(0, -0.1 + 0.0175, 0);
  socket.add(mesh(smooth(collar), M.rubber, 'socket_collar'));
  const boot = new THREE.CylinderGeometry(0.045, 0.054, 0.07, 20);
  boot.translate(0, -0.1 + 0.035 + 0.035, 0);
  socket.add(mesh(smooth(boot), M.orange, 'socket_boot'));
  root.add(socket);
}

/* ── keys: tray + four sculpted caps ──────────────────────────────────────── */
const TRAY = { x: -0.26, y: -0.47, w: 1.22, h: 0.3 };
{
  const lip = rrect(new THREE.Shape(), TRAY.w + 0.05, TRAY.h + 0.05, 0.085);
  lip.holes.push(rrect(new THREE.Path(), TRAY.w, TRAY.h, 0.06));
  const lg = new THREE.ExtrudeGeometry(lip, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3, curveSegments: 6 });
  lg.translate(TRAY.x, TRAY.y, FACE);
  root.add(mesh(smooth(lg), M.cream, 'tray_lip'));
  const floor = new THREE.ShapeGeometry(rrect(new THREE.Shape(), TRAY.w + 0.01, TRAY.h + 0.01, 0.065), 6);
  floor.translate(TRAY.x, TRAY.y, FACE + 0.001);
  root.add(mesh(lean(floor), M.rubber, 'tray'));
}

/**
 * Sculpted keycap built from stacked rounded-rect rings: tapered walls, a filleted shoulder and a
 * cylindrical dish across the top. Base centre at the origin, top facing +Z.
 */
function keycap(w, d, h) {
  const PER = 6; // points per corner arc
  const taper = 0.03, f = 0.032, dish = 0.011;
  const topHw = w / 2 - taper, topHd = d / 2 - taper;
  const rings = [
    { hw: w / 2, hd: d / 2, rc: 0.05, z: 0 },
    { hw: w / 2 - taper * 0.35, hd: d / 2 - taper * 0.35, rc: 0.048, z: h * 0.45 },
  ];
  for (let i = 0; i <= 4; i++) {
    const a = (i / 4) * (Math.PI / 2);
    const inset = f * (1 - Math.cos(a));
    rings.push({ hw: topHw - inset, hd: topHd - inset, rc: Math.max(0.012, 0.046 - inset), z: h - f + f * Math.sin(a) });
  }
  for (const s of [0.78, 0.55, 0.32, 0.12]) rings.push({ hw: (topHw - f) * s, hd: (topHd - f) * s, rc: 0.014 * s + 0.002, z: h });

  const pos = [];
  const surface = (x, z) => {
    const t = Math.min(1, Math.max(0, (z - (h - f)) / f));
    const wgt = t * t * (3 - 2 * t);
    const u = Math.min(1, Math.abs(x) / topHw);
    return z - dish * (1 - u * u) * wgt;
  };
  for (const r of rings) {
    const corners = [
      [r.hw - r.rc, r.hd - r.rc, 0],
      [-(r.hw - r.rc), r.hd - r.rc, Math.PI / 2],
      [-(r.hw - r.rc), -(r.hd - r.rc), Math.PI],
      [r.hw - r.rc, -(r.hd - r.rc), Math.PI * 1.5],
    ];
    for (const [cx, cy, a0] of corners)
      for (let k = 0; k < PER; k++) {
        const a = a0 + (k / (PER - 1)) * (Math.PI / 2);
        const x = cx + Math.cos(a) * r.rc, y = cy + Math.sin(a) * r.rc;
        pos.push(x, y, surface(x, r.z));
      }
  }
  const P = PER * 4;
  const centre = pos.length / 3;
  pos.push(0, 0, h - dish);
  const idx = [];
  for (let i = 0; i < rings.length - 1; i++)
    for (let j = 0; j < P; j++) {
      const a = i * P + j, b = i * P + ((j + 1) % P), c = (i + 1) * P + j, dd = (i + 1) * P + ((j + 1) % P);
      idx.push(a, b, dd, a, dd, c);
    }
  const last = (rings.length - 1) * P;
  for (let j = 0; j < P; j++) idx.push(last + j, last + ((j + 1) % P), centre);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { geo: g, conform: (geo) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + surface(p.getX(i), h) - 0.0012);
    return geo;
  } };
}

const KEY = { w: 0.264, d: 0.22, h: 0.1, gap: 0.035 };
const cap = keycap(KEY.w, KEY.d, KEY.h);
const T = 0.0045; // legend thickness

function legend(id) {
  const parts = [];
  const sw = 0.0095;
  if (id === 'design') {
    const s = new THREE.Shape();
    const R = 0.044, k = 0.007;
    s.moveTo(0, R);
    s.quadraticCurveTo(k, k, R, 0);
    s.quadraticCurveTo(k, -k, 0, -R);
    s.quadraticCurveTo(-k, -k, -R, 0);
    s.quadraticCurveTo(-k, k, 0, R);
    const g = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false, curveSegments: 8 });
    parts.push(g);
    const dot = new THREE.CylinderGeometry(0.009, 0.009, T, 12);
    dot.rotateX(Math.PI / 2);
    dot.translate(0.045, 0.04, T / 2);
    parts.push(dot);
  } else if (id === 'code') {
    parts.push(seg(-0.022, 0.026, -0.05, 0, sw, T), seg(-0.05, 0, -0.022, -0.026, sw, T));
    parts.push(seg(0.022, 0.026, 0.05, 0, sw, T), seg(0.05, 0, 0.022, -0.026, sw, T));
    parts.push(seg(0.011, 0.034, -0.011, -0.034, sw, T));
  } else if (id === 'experiment') {
    const R = 0.042, c = Math.cos(Math.PI / 6) * R, s = R / 2;
    const v = [[0, R], [c, s], [c, -s], [0, -R], [-c, -s], [-c, s]];
    for (let i = 0; i < 6; i++) parts.push(seg(...v[i], ...v[(i + 1) % 6], sw, T));
    parts.push(seg(0, 0, -c, s, sw, T), seg(0, 0, c, s, sw, T), seg(0, 0, 0, -R, sw, T));
  } else {
    const s = new THREE.Shape();
    s.moveTo(-0.02, 0.032);
    s.lineTo(0.036, 0);
    s.lineTo(-0.02, -0.032);
    s.closePath();
    parts.push(new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false }));
  }
  return cap.conform(lean(merge(parts)));
}

{
  const ids = ['design', 'code', 'experiment', 'play'];
  const x0 = TRAY.x - TRAY.w / 2 + 0.03 + KEY.w / 2;
  ids.forEach((id, i) => {
    const g = new THREE.Group();
    g.name = `key_${id}`;
    g.position.set(x0 + i * (KEY.w + KEY.gap), TRAY.y, FACE + 0.002);
    g.add(mesh(cap.geo, id === 'play' ? M.orange : M.keycap, `key_${id}_cap`));
    g.add(mesh(legend(id), M.ink, `key_${id}_legend`));
    root.add(g);
  });
}

const scene = new THREE.Scene();
scene.add(root);
await exportGLB(scene, 'console');
