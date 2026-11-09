"use client";
// The hero cloth: a hanging denim panel (vertex-shader wind, folds and a cursor tug) with a
// selvedge edge, chain-stitched hem and a sewn-on brand patch. Loaded with next/dynamic (ssr:false).
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { pointer } from "@/lib/pointer";
import { on } from "@/lib/system";
import { drawFabric } from "./fabric";

export interface ClothProps {
  /** on screen — the render loop stops when false */
  active: boolean;
  chaos: boolean;
  /** boot finished — the cloth stays rolled under its rod until then, and drops when it flips true */
  booted: boolean;
  coarse: boolean;
  warp: string;
  weft: string;
  /** selvedge ID thread + patch colour */
  accent: string;
  ink: string;
  patch: string;
}

const W = 2.2;
const H = 3;

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform float uWhip;
uniform float uHoverAmt;
uniform float uDrop;
uniform vec2 uHover;
uniform vec2 uGrab;
uniform vec2 uSize;
uniform vec3 uPull;
varying vec2 vUv;
varying vec3 vN;

vec3 displace(vec2 uv) {
  vec3 p = vec3((uv.x - 0.5) * uSize.x, (uv.y - 0.5) * uSize.y, 0.0);
  float hang = 1.0 - uv.y;
  float h = pow(hang, 1.2);
  float t = uTime;
  float wind = sin(p.x * 1.7 + t * 0.9 + p.y * 0.8) * 0.09
             + sin(p.x * 3.6 - t * 1.3 + p.y * 2.1) * 0.04
             + sin(p.y * 5.0 + t * 1.8 + p.x * 0.6) * 0.018;
  float folds = sin(p.x * 7.5 + sin(p.y * 1.4 + t * 0.55) * 0.9) * 0.05
              + sin(p.x * 3.1 - 1.3 + sin(p.y * 0.9 - t * 0.4) * 0.6) * 0.035;
  p.z += (wind * uAmp + folds * (0.4 + h)) * h;
  p.z += uWhip * sin(hang * 10.0 - t * 13.0) * 0.32 * h;
  p.x += uWhip * sin(hang * 7.0 - t * 10.0) * 0.11 * h;
  vec2 q = uv * uSize;
  float dh = distance(q, uHover * uSize);
  p.z += uHoverAmt * exp(-dh * dh * 5.0) * 0.16 * smoothstep(0.0, 0.25, hang);
  float dg = distance(q, uGrab * uSize);
  p += uPull * exp(-dg * dg * 1.6) * smoothstep(0.0, 0.4, hang);
  // intro: rolled up under the rod, then dropped
  p.y = mix(p.y, uSize.y * 0.5 - hang * uSize.y * 0.07, uDrop);
  p.z += uDrop * sin(hang * 46.0) * 0.05;
  return p;
}

void main() {
  vUv = uv;
  float e = 0.004;
  vec3 p = displace(uv);
  vec3 px = displace(uv + vec2(e, 0.0));
  vec3 py = displace(uv + vec2(0.0, e));
  vN = normalize(normalMatrix * normalize(cross(px - p, py - p)));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D uMap;
uniform sampler2D uPatch;
uniform vec2 uRepeat;
uniform vec3 uSelvedge;
uniform vec3 uStitch;
uniform vec3 uEcru;
uniform vec4 uPatchRect;
uniform float uPatchReady;
varying vec2 vUv;
varying vec3 vN;

void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  float diff = max(dot(n, normalize(vec3(-0.62, 0.5, 0.62))), 0.0);
  float fill = max(dot(n, normalize(vec3(0.6, -0.2, 0.7))), 0.0) * 0.22;
  vec3 col = texture2D(uMap, vUv * uRepeat).rgb;

  // selvedge: undyed edge with the ID thread running through it
  float edge = min(vUv.x, 1.0 - vUv.x);
  if (edge < 0.02) {
    col = uEcru * (0.86 + 0.14 * fract(sin(vUv.y * 1800.0) * 43758.5));
    if (edge > 0.008 && edge < 0.0125) col = uSelvedge;
  }
  // folded hem with a chain stitch
  if (vUv.y < 0.032) {
    col *= 0.78;
    float st = step(0.42, fract(vUv.x * 64.0)) * (1.0 - smoothstep(0.0016, 0.0032, abs(vUv.y - 0.017)));
    col = mix(col, uStitch, st);
  }
  // sewn-on patch
  if (uPatchReady > 0.5 && vUv.x > uPatchRect.x && vUv.x < uPatchRect.z && vUv.y > uPatchRect.y && vUv.y < uPatchRect.w) {
    vec4 pc = texture2D(uPatch, (vUv - uPatchRect.xy) / (uPatchRect.zw - uPatchRect.xy));
    col = mix(col, pc.rgb, pc.a);
  }
  vec3 lit = col * (0.3 + 1.0 * diff + fill) + pow(1.0 - abs(n.z), 3.0) * 0.05;
  gl_FragColor = vec4(lit, 1.0);
  #include <colorspace_fragment>
}
`;

/** Brand patch drawn with the page's own serif (next/font exposes it as a CSS variable). */
function drawPatch(canvas: HTMLCanvasElement, bg: string, ink: string, text: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = bg;
  ctx.fillRect(6, 6, w - 12, h - 12);
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.55;
  ctx.setLineDash([10, 7]);
  ctx.lineWidth = 3;
  ctx.strokeRect(16, 16, w - 32, h - 32);
  ctx.globalAlpha = 1;
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-instrument").trim() || "serif";
  ctx.fillStyle = ink;
  ctx.font = `italic 400 ${Math.round(h * 0.62)}px ${family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2 + h * 0.04);
}

function ClothMesh({ chaos, booted, coarse, warp, weft, accent, ink, patch }: Omit<ClothProps, "active">) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);

  const geometry = useMemo(() => new THREE.PlaneGeometry(W, H, 56, 78), []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        side: THREE.DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uAmp: { value: 1 },
          uWhip: { value: 0 },
          uHoverAmt: { value: 0 },
          uDrop: { value: 0 },
          uHover: { value: new THREE.Vector2(0.5, 0.5) },
          uGrab: { value: new THREE.Vector2(0.5, 0.4) },
          uSize: { value: new THREE.Vector2(W, H) },
          uPull: { value: new THREE.Vector3() },
          uMap: { value: null },
          uPatch: { value: null },
          uRepeat: { value: new THREE.Vector2(3.3, 4.5) },
          uSelvedge: { value: new THREE.Color() },
          uStitch: { value: new THREE.Color("#c4823b") },
          uEcru: { value: new THREE.Color("#e6dfcf") },
          uPatchRect: { value: new THREE.Vector4(0.56, 0.79, 0.9, 0.875) },
          uPatchReady: { value: 0 },
        },
      }),
    [],
  );

  // denim texture — assigned before the first frame so the cloth never renders black
  useLayoutEffect(() => {
    const tex = new THREE.CanvasTexture(drawFabric({ warp, weft, weave: "twill-3x1", size: 384, fade: 0.14 }));
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    material.uniforms.uMap.value = tex;
    (material.uniforms.uSelvedge.value as THREE.Color).set(accent);
    return () => tex.dispose();
  }, [material, warp, weft, accent]);

  // patch texture (redrawn once fonts are ready)
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 384;
    canvas.height = 128;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    let alive = true;
    const paint = () => {
      if (!alive) return;
      drawPatch(canvas, accent, ink, patch);
      tex.needsUpdate = true;
      material.uniforms.uPatch.value = tex;
      material.uniforms.uPatchReady.value = 1;
    };
    paint();
    void document.fonts?.ready.then(paint);
    return () => {
      alive = false;
      tex.dispose();
    };
  }, [material, accent, ink, patch]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  // frame the cloth whatever the canvas aspect is
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const visibleH = Math.max(H + 0.38, (W + 0.55) / aspect);
    camera.position.set(0, 0, visibleH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))));
    camera.updateProjectionMatrix();
  }, [camera, size]);

  const st = useRef({
    time: 0,
    chaos: 0,
    whip: 0,
    drop: 1,
    dropTo: 1,
    hoverAmt: 0,
    down: false,
    pending: false,
    grabbing: false,
    hover: new THREE.Vector2(0.5, 0.5),
    grab: new THREE.Vector2(0.5, 0.4),
    start: new THREE.Vector3(),
    pull: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    target: new THREE.Vector3(),
    hit: new THREE.Vector3(),
    press: new THREE.Vector2(),
    /** where the shared pointer was at the press (it lags behind touches) */
    stale: new THREE.Vector2(),
    ndc: new THREE.Vector2(),
    tmp: new THREE.Vector2(),
    ray: new THREE.Raycaster(),
    plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
  });

  // grab with the pointer (own down/up flags so a cancelled touch never leaves it stuck)
  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      const s = st.current;
      s.down = true;
      s.pending = true;
      s.press.set(e.clientX, e.clientY);
      s.stale.set(pointer.x, pointer.y);
    };
    const up = () => {
      st.current.down = false;
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [gl]);

  useEffect(
    () =>
      on("chaos:burst", () => {
        st.current.whip = 1;
      }),
    [],
  );

  // intro: rolled up under the rod until the system has booted, then it drops (again on restart)
  useEffect(() => {
    st.current.drop = 1;
    st.current.dropTo = booted ? 0 : 1;
  }, [booted]);

  useFrame((_, delta) => {
    const s = st.current;
    const u = material.uniforms;
    const dt = Math.min(delta, 1 / 30);
    s.chaos += ((chaos ? 1 : 0) - s.chaos) * Math.min(1, dt * 2);
    s.time += dt * (1 + s.chaos * 0.9);

    // pointer → cloth plane. A touch has no pointermove before its pointerdown (nor while the finger
    // rests), so until the shared pointer moves on from where it was at the press, read the press point.
    const fresh = pointer.x !== s.stale.x || pointer.y !== s.stale.y;
    const px = fresh ? pointer.x : s.press.x;
    const py = fresh ? pointer.y : s.press.y;
    const rect = gl.domElement.getBoundingClientRect();
    s.ndc.set(((px - rect.left) / rect.width) * 2 - 1, -((py - rect.top) / rect.height) * 2 + 1);
    s.ray.setFromCamera(s.ndc, camera);
    const got = s.ray.ray.intersectPlane(s.plane, s.hit) !== null;
    const ux = s.hit.x / W + 0.5;
    const uy = s.hit.y / H + 0.5;
    // a finger has no hover: touch bulges only while held (the last tap would otherwise bulge forever)
    const over = got && (s.down || pointer.inside) && (!coarse || s.down) && ux > -0.08 && ux < 1.08 && uy > -0.05 && uy < 1.02;
    if (over) s.hover.lerp(s.tmp.set(ux, uy), Math.min(1, dt * 10));
    s.hoverAmt += ((over ? 1 : 0) - s.hoverAmt) * Math.min(1, dt * 4);

    if (s.pending) {
      s.pending = false;
      if (over && ux > 0 && ux < 1 && uy > 0 && uy < 1) {
        s.grabbing = true;
        s.grab.set(ux, uy);
        s.start.copy(s.hit);
      }
    }
    if (s.grabbing && !s.down) s.grabbing = false;

    s.target.set(0, 0, 0);
    if (s.grabbing && got) {
      s.target.set(s.hit.x - s.start.x, s.hit.y - s.start.y, 0.32);
      if (s.target.length() > 1.15) s.target.setLength(1.15);
    }
    const k = s.grabbing ? 90 : 34;
    const c = s.grabbing ? 14 : 3.6;
    s.vel.x += ((s.target.x - s.pull.x) * k - s.vel.x * c) * dt;
    s.vel.y += ((s.target.y - s.pull.y) * k - s.vel.y * c) * dt;
    s.vel.z += ((s.target.z - s.pull.z) * k - s.vel.z * c) * dt;
    s.pull.addScaledVector(s.vel, dt);

    // chaos: the cloth whips on its own every couple of seconds
    if (chaos && Math.random() < dt * 0.7) s.whip = 1;
    s.whip = Math.max(0, s.whip - dt * 0.85);
    s.drop = Math.max(s.dropTo, s.drop - dt * 0.7);
    const ease = s.drop * s.drop * (3 - 2 * s.drop);

    u.uTime.value = s.time;
    u.uAmp.value = 1 + s.chaos * 1.5 + Math.min(1, pointer.speed / 40) * 0.4 * s.hoverAmt;
    u.uWhip.value = s.whip;
    u.uDrop.value = ease;
    u.uHoverAmt.value = s.hoverAmt;
    (u.uHover.value as THREE.Vector2).copy(s.hover);
    (u.uGrab.value as THREE.Vector2).copy(s.grab);
    (u.uPull.value as THREE.Vector3).copy(s.pull);
  });

  return (
    <group>
      <mesh geometry={geometry} material={material} />
      <mesh position={[0, H / 2 + 0.02, 0.02]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.028, 0.028, W + 0.34, 16]} />
        <meshStandardMaterial color="#1b1d24" metalness={0.55} roughness={0.35} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (W / 2 + 0.19), H / 2 + 0.02, 0.02]}>
          <sphereGeometry args={[0.05, 16, 12]} />
          <meshStandardMaterial color="#1b1d24" metalness={0.55} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

export default function Cloth({ active, ...rest }: ClothProps) {
  const { coarse } = rest;
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={coarse ? [1, 1.25] : [1, 1.75]}
      camera={{ position: [0, 0, 6.4], fov: 30 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ touchAction: "pan-y" }}
      aria-hidden
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[-2, 3, 4]} intensity={1.6} />
      <ClothMesh {...rest} />
    </Canvas>
  );
}
