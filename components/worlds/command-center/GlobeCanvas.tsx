"use client";
// The hologram globe (R3F). Loaded with next/dynamic from Globe.tsx — never import directly.
// Glow is additive blending on purpose: the canvas is transparent over the room's CSS layers, where a
// postprocessing bloom pass would need an opaque buffer (and cost a full-screen pass on phones).
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { pointer } from "@/lib/pointer";
import { seeded } from "@/lib/utils";
import { arcPath, landDots, toVec } from "./geo";
import type { GlobeProps } from "./Globe";

const D2R = Math.PI / 180;
const TILT = 0.6; // fraction of the focus latitude the globe tilts toward
const IDLE_LAT = 22;
const LIME = new THREE.Color("#d8ff00");
const ALERT = new THREE.Color("#ff5a1f");
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/* ── shaders ── */
const DOT_VERT = /* glsl */ `
  uniform float uTime; uniform float uChaos; uniform float uSize; uniform float uScale;
  attribute float aRand;
  varying float vFace; varying float vRand; varying float vY;
  void main() {
    vec3 p = position + normalize(position) * sin(uTime * 23.0 + aRand * 90.0) * 0.03 * uChaos * step(0.72, aRand);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vFace = dot(normalize(normalMatrix * normalize(position)), normalize(-mv.xyz));
    vRand = aRand;
    vY = (modelMatrix * vec4(p, 1.0)).y;
    gl_PointSize = uSize * uScale * (4.6 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }`;
const DOT_FRAG = /* glsl */ `
  uniform float uTime; uniform float uChaos; uniform float uAlpha; uniform vec3 uLime; uniform vec3 uAlert;
  varying float vFace; varying float vRand; varying float vY;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float front = smoothstep(-0.15, 0.45, vFace);
    float scan = 1.0 - smoothstep(0.0, 0.07, abs(vY - (fract(uTime * 0.11) * 2.8 - 1.4)));
    float twinkle = 0.8 + 0.2 * sin(uTime * 1.7 + vRand * 40.0);
    vec3 col = mix(uLime, uAlert, uChaos * (0.55 + 0.45 * step(0.5, fract(vRand * 7.0 + uTime * 2.0))));
    float a = uAlpha * (1.0 - smoothstep(0.12, 0.5, d)) * mix(0.06, 1.0, front) * twinkle + scan * 0.5 * front;
    gl_FragColor = vec4(col * (0.8 + scan), a);
    #include <colorspace_fragment>
  }`;
const CITY_VERT = /* glsl */ `
  uniform float uScale;
  attribute float aHeat; attribute float aHq; attribute float aRand;
  varying float vLit; varying float vFace; varying float vRand; varying float vCore;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vFace = dot(normalize(normalMatrix * normalize(position)), normalize(-mv.xyz));
    vLit = max(aHeat, aHq * 0.7);
    vRand = aRand;
    float size = (7.0 + vLit * 32.0) * uScale;
    gl_PointSize = size;
    vCore = min(0.5, 3.2 * uScale / size);
    gl_Position = projectionMatrix * mv;
  }`;
const CITY_FRAG = /* glsl */ `
  uniform float uTime; uniform float uChaos; uniform vec3 uLime; uniform vec3 uAlert;
  varying float vLit; varying float vFace; varying float vRand; varying float vCore;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float core = 1.0 - smoothstep(vCore * 0.35, vCore, d);
    float ph = fract(uTime * 0.8 + vRand);
    float ring = (1.0 - smoothstep(0.0, 0.035, abs(d - ph * 0.46))) * (1.0 - ph) * vLit;
    float front = smoothstep(-0.1, 0.3, vFace);
    gl_FragColor = vec4(mix(uLime, uAlert, uChaos) * (1.0 + core * 0.7), (core * (0.5 + vLit * 0.5) + ring) * front);
    #include <colorspace_fragment>
  }`;
const ARC_VERT = /* glsl */ `
  varying float vT; varying float vFace;
  void main() {
    vT = uv.x;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vFace = dot(normalize(normalMatrix * normalize(position)), normalize(-mv.xyz));
    gl_Position = projectionMatrix * mv;
  }`;
const ARC_FRAG = /* glsl */ `
  uniform float uProgress; uniform float uAlpha; uniform float uTime; uniform vec3 uColor;
  varying float vT; varying float vFace;
  void main() {
    if (vT > uProgress) discard;
    float drawing = step(uProgress, 0.999);
    float head = smoothstep(uProgress - 0.14, uProgress, vT) * drawing;
    float pulse = (1.0 - smoothstep(0.0, 0.06, abs(fract(uTime * 0.42) - vT))) * (1.0 - drawing);
    float a = uAlpha * (0.4 + head * 0.6 + pulse * 0.9) * mix(0.12, 1.0, smoothstep(-0.35, 0.25, vFace));
    gl_FragColor = vec4(uColor * (1.0 + head * 1.6 + pulse * 1.2), a);
    #include <colorspace_fragment>
  }`;
const RIM_VERT = /* glsl */ `
  varying vec3 vN; varying vec3 vV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;
const RIM_FRAG = /* glsl */ `
  uniform vec3 uLime; uniform vec3 uAlert; uniform float uChaos;
  varying vec3 vN; varying vec3 vV;
  void main() {
    float f = pow(1.0 - max(dot(vN, vV), 0.0), 2.6);
    gl_FragColor = vec4(mix(uLime, uAlert, uChaos), f * 0.75);
    #include <colorspace_fragment>
  }`;

const glow = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } as const;
const shared = () => ({ uTime: { value: 0 }, uChaos: { value: 0 }, uScale: { value: 1 }, uLime: { value: LIME }, uAlert: { value: ALERT } });

function vecs(n: number, at: (i: number) => readonly number[]) {
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) out.set(at(i), i * 3);
  return out;
}

function pointsGeometry(positions: Float32Array) {
  const g = new THREE.BufferGeometry();
  const n = positions.length / 3;
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  g.setAttribute("aRand", new THREE.BufferAttribute(Float32Array.from({ length: n }, (_, i) => seeded(i + 1)), 1));
  return g;
}

function graticule() {
  const pts: number[] = [];
  const seg = (a: number[], b: number[]) => pts.push(...a, ...b);
  for (const lat of [-60, -30, 0, 30, 60])
    for (let lon = -180; lon < 180; lon += 6) seg(toVec(lon, lat, 1.001), toVec(lon + 6, lat, 1.001));
  for (let lon = -180; lon < 180; lon += 30)
    for (let lat = -84; lat < 84; lat += 6) seg(toVec(lon, lat, 1.001), toVec(lon, lat + 6, 1.001));
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

interface Slot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  key: string | null;
  to: string;
  born: number;
  ttl: number;
}

function Holo({ cities, hq, focus, arcs, chaos, coarse }: GlobeProps & { coarse: boolean }) {
  const group = useRef<THREE.Group>(null);
  const home = cities.find((c) => c.id === hq) ?? cities[0];
  const spin = useRef(-home.lon * D2R);
  const heat = useRef(0);
  const nextAmbient = useRef(1);
  const ambientN = useRef(0);

  const res = useMemo(() => {
    const d = landDots(1.5);
    const land = pointsGeometry(vecs(d.length / 2, (i) => toVec(d[i * 2], d[i * 2 + 1])));
    const n = 1800; // faint Fibonacci shell so the ocean still reads as a sphere
    const ocean = pointsGeometry(
      vecs(n, (i) => {
        const y = 1 - (i / (n - 1)) * 2;
        const r = Math.sqrt(1 - y * y) * 0.995;
        const phi = i * 2.399963229728653;
        return [Math.cos(phi) * r, y * 0.995, Math.sin(phi) * r];
      }),
    );
    const city = pointsGeometry(vecs(cities.length, (i) => toVec(cities[i].lon, cities[i].lat, 1.006)));
    city.setAttribute("aHeat", new THREE.BufferAttribute(new Float32Array(cities.length), 1));
    city.setAttribute("aHq", new THREE.BufferAttribute(Float32Array.from(cities, (c) => (c.id === hq ? 1 : 0)), 1));

    const dot = (size: number, alpha: number) =>
      new THREE.ShaderMaterial({ ...glow, uniforms: { ...shared(), uSize: { value: size }, uAlpha: { value: alpha } }, vertexShader: DOT_VERT, fragmentShader: DOT_FRAG });
    const landMat = dot(2.4, 0.95);
    const oceanMat = dot(1.4, 0.16);
    const cityMat = new THREE.ShaderMaterial({ ...glow, uniforms: shared(), vertexShader: CITY_VERT, fragmentShader: CITY_FRAG });
    const rimMat = new THREE.ShaderMaterial({ ...glow, uniforms: shared(), vertexShader: RIM_VERT, fragmentShader: RIM_FRAG });
    const gridMat = new THREE.LineBasicMaterial({ color: LIME, ...glow, opacity: 0.07 });
    const bodyMat = new THREE.MeshBasicMaterial({ color: "#030605", transparent: true, opacity: 0.6, depthWrite: false });
    const sphere = new THREE.SphereGeometry(1, 48, 32);
    const grid = graticule();

    const arcGroup = new THREE.Group();
    const slots: Slot[] = Array.from({ length: 20 }, () => {
      const mat = new THREE.ShaderMaterial({
        ...glow,
        uniforms: { uProgress: { value: 0 }, uAlpha: { value: 0 }, uTime: { value: 0 }, uColor: { value: LIME.clone() } },
        vertexShader: ARC_VERT,
        fragmentShader: ARC_FRAG,
      });
      const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      arcGroup.add(mesh);
      return { mesh, mat, key: null, to: "", born: 0, ttl: 0 };
    });

    const byId = new Map(cities.map((c, i) => [c.id, { c, i }]));
    const tubes = new Map<string, THREE.TubeGeometry>();
    const tube = (to: string) => {
      let g = tubes.get(to);
      const b = byId.get(to)?.c;
      if (!g && b && to !== home.id) {
        const pts = arcPath([home.lon, home.lat], [b.lon, b.lat]).map((p) => new THREE.Vector3(...p));
        g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.0075, 6, false);
        tubes.set(to, g);
      }
      return g ?? null;
    };

    return { land, ocean, city, landMat, oceanMat, cityMat, rimMat, gridMat, bodyMat, sphere, grid, arcGroup, slots, tubes, tube, byId, lit: new Float32Array(cities.length) };
  }, [cities, hq, home]);

  useEffect(
    () => () => {
      [res.land, res.ocean, res.city, res.sphere, res.grid, ...res.tubes.values()].forEach((g) => g.dispose());
      [res.landMat, res.oceanMat, res.cityMat, res.rimMat, res.gridMat, res.bodyMat, ...res.slots.map((s) => s.mat)].forEach((m) => m.dispose());
    },
    [res],
  );

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    // rotation: drift when idle, turn to the matter on the table, spin up when the board loses order
    heat.current += ((chaos ? 1 : 0) - heat.current) * Math.min(1, dt * 3);
    if (chaos) spin.current += dt * 2.4;
    else if (focus) spin.current += wrap(-focus[0] * D2R - spin.current) * (1 - Math.exp(-dt * 2.2));
    else spin.current += dt * 0.07;
    const px = coarse ? 0 : pointer.nx;
    const py = coarse ? 0 : pointer.ny;
    g.rotation.y = spin.current + px * 0.18;
    g.rotation.x += ((focus ? focus[1] : IDLE_LAT) * D2R * TILT - py * 0.1 - g.rotation.x) * (1 - Math.exp(-dt * 2.5));
    g.rotation.z = heat.current * Math.sin(t * 11) * 0.05;

    const scale = (state.size.height / 600) * state.gl.getPixelRatio();
    for (const m of [res.landMat, res.oceanMat, res.cityMat, res.rimMat]) {
      m.uniforms.uTime.value = t;
      m.uniforms.uChaos.value = heat.current;
      m.uniforms.uScale.value = scale;
    }

    // agent arcs follow props; removed ones fade out
    const wanted = new Set(arcs.map((a) => a.key));
    for (const s of res.slots) if (s.key && s.ttl === Infinity && !wanted.has(s.key)) s.ttl = t - s.born + 0.5;
    for (const a of arcs) {
      if (res.slots.some((s) => s.key === a.key)) continue;
      const s = res.slots.find((x) => !x.key);
      const geo = res.tube(a.to);
      if (s && geo) launch(s, a.key, a.to, t, Infinity, a.tone === "alert" ? ALERT : LIME, geo);
    }
    // ambient traffic while nobody is talking (constant, frantic in chaos)
    if (t > nextAmbient.current && (chaos || arcs.length === 0)) {
      nextAmbient.current = t + (chaos ? 0.16 : 2.2);
      const s = res.slots.find((x) => !x.key);
      const to = cities[Math.floor(Math.random() * cities.length)].id;
      const geo = res.tube(to);
      if (s && geo) launch(s, `~${ambientN.current++}`, to, t, chaos ? 1.5 : 3.4, chaos ? ALERT : LIME, geo);
    }

    res.lit.fill(0);
    for (const s of res.slots) {
      if (!s.key) continue;
      const age = t - s.born;
      if (age > s.ttl) {
        s.key = null;
        s.mesh.visible = false;
        continue;
      }
      const p = Math.min(1, age / 1.1);
      const fade = s.ttl === Infinity ? 1 : Math.max(0, Math.min(1, (s.ttl - age) / 0.5, age / 0.15));
      s.mat.uniforms.uProgress.value = p;
      s.mat.uniforms.uAlpha.value = fade;
      s.mat.uniforms.uTime.value = t;
      const ci = res.byId.get(s.to)?.i;
      if (p > 0.92 && ci !== undefined) res.lit[ci] = Math.max(res.lit[ci], fade);
    }
    const heatAttr = res.city.getAttribute("aHeat") as THREE.BufferAttribute;
    const arr = heatAttr.array as Float32Array;
    for (let i = 0; i < arr.length; i++) arr[i] += (res.lit[i] - arr[i]) * Math.min(1, dt * 5);
    heatAttr.needsUpdate = true;
  });

  return (
    <group ref={group} rotation-x={IDLE_LAT * D2R * TILT}>
      <mesh geometry={res.sphere} material={res.bodyMat} scale={0.985} renderOrder={0} />
      <lineSegments geometry={res.grid} material={res.gridMat} renderOrder={1} />
      <points geometry={res.ocean} material={res.oceanMat} renderOrder={1} />
      <points geometry={res.land} material={res.landMat} renderOrder={2} />
      <primitive object={res.arcGroup} />
      <points geometry={res.city} material={res.cityMat} renderOrder={3} />
      <mesh geometry={res.sphere} material={res.rimMat} scale={1.07} renderOrder={4} />
    </group>
  );
}

function launch(s: Slot, key: string, to: string, t: number, ttl: number, color: THREE.Color, geo: THREE.BufferGeometry) {
  s.key = key;
  s.to = to;
  s.born = t;
  s.ttl = ttl;
  (s.mat.uniforms.uColor.value as THREE.Color).copy(color);
  s.mesh.geometry = geo;
  s.mesh.visible = true;
}

export default function GlobeCanvas(props: GlobeProps & { active: boolean; coarse: boolean; onReady: () => void }) {
  const { active, onReady, ...rest } = props;
  return (
    <div className="pointer-events-none absolute inset-0">
      <Canvas
        dpr={[1, props.coarse ? 1.3 : 1.75]}
        frameloop={active ? "always" : "never"}
        camera={{ position: [0, 0, 4.6], fov: 35 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        // hand over from the static globe after the first WebGL frame has had a chance to draw
        onCreated={() => requestAnimationFrame(onReady)}
      >
        <Holo {...rest} />
      </Canvas>
    </div>
  );
}
