"use client";
// The 3D console. Loaded with next/dynamic(ssr:false) from Console.tsx — never import it directly.
// Every visible motion reads the shared Rig in useFrame; React only re-renders this on prop changes.
import { Suspense, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree, type RootState } from "@react-three/fiber";
import { Environment, Lightformer, Shadow, useGLTF } from "@react-three/drei";
import { EffectComposer, SelectiveBloom, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { pointer } from "@/lib/pointer";
import { clamp } from "@/lib/utils";
import { KEYS, VIEW, type ControlId, type KeyId, type Rig } from "./rig";
import { createScreen } from "./screen";

const MODEL = "/models/console.glb";
useGLTF.preload(MODEL, false, false);

export interface SceneProps {
  rig: Rig;
  /** on-screen — the frameloop stops entirely when false */
  active: boolean;
  reduced: boolean;
  coarse: boolean;
  dark: boolean;
  /** reduced motion still animates while the visitor plays the game they started */
  playing: boolean;
  onReady: () => void;
  onLost: () => void;
}

interface Fit {
  cx: number;
  cy: number;
  s: number;
  visW: number;
  visH: number;
}

// memo: Console re-renders on every knob move; the Canvas must not (see Lights).
export default memo(function Scene({ rig, active, reduced, coarse, dark, playing, onReady, onLost }: SceneProps) {
  const post = !coarse;
  // A fixed resolution: 1.5× (1.25× on touch). It used to flip between that and 1× with the frame
  // rate, and every flip reallocated the drawing buffer and the bloom targets — a stall each time.
  const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, coarse ? 1.25 : 1.5);
  // No frame is drawn until every shader has compiled in the background (see Stage).
  const [warm, setWarm] = useState(false);
  const onWarm = useCallback(() => setWarm(true), []);
  // "demand": Stage paces the frames itself — every frame while anything moves, 30 fps at rest.
  const paced = active && warm && !(reduced && !playing);
  return (
    <Canvas
      aria-hidden
      frameloop={!active || !warm ? "never" : "demand"}
      dpr={dpr}
      camera={{ fov: 24, position: [0, 0, 9], near: 3, far: 20 }}
      gl={{ alpha: true, antialias: !post, powerPreference: "high-performance", toneMapping: THREE.NeutralToneMapping }}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      onCreated={({ gl }) =>
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          onLost();
        })
      }
    >
      <Suspense fallback={null}>
        <Stage rig={rig} coarse={coarse} dark={dark} post={post} paced={paced} onWarm={onWarm} onReady={onReady} />
      </Suspense>
    </Canvas>
  );
});

function Stage({
  rig,
  coarse,
  dark,
  post,
  paced,
  onWarm,
  onReady,
}: {
  rig: Rig;
  coarse: boolean;
  dark: boolean;
  post: boolean;
  paced: boolean;
  onWarm: () => void;
  onReady: () => void;
}) {
  const { scene: model } = useGLTF(MODEL, false, false);
  const group = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Group>(null);
  const pool = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>>(null);
  const core = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>>(null);
  const fit = useRef<Fit>({ cx: 0, cy: 0, s: 1, visW: 1, visH: 1 });

  const parts = useMemo(() => {
    const get = (n: string) => {
      const o = model.getObjectByName(n);
      if (!o) throw new Error(`console.glb is missing "${n}"`);
      o.userData.p0 ??= o.position.clone();
      return o;
    };
    return {
      screen: get("screen") as THREE.Mesh,
      led: get("led") as THREE.Mesh,
      knob: get("knob"),
      sw: get("switch"),
      lever: get("switch_lever"),
      socket: get("socket"),
      keys: Object.fromEntries(KEYS.map((k) => [k, get(`key_${k}`)])) as Record<KeyId, THREE.Object3D>,
    };
  }, [model]);

  // CRT: unlit phosphor canvas (the only thing that blooms) + an additive glass layer for reflections.
  const crt = useMemo(() => {
    const screen = createScreen(rig);
    const tex = new THREE.CanvasTexture(screen.canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const phosphor = new THREE.MeshBasicMaterial({ map: tex });
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0x000000,
      roughness: 0.14,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return { screen, tex, phosphor, glass };
  }, [rig]);

  useEffect(() => {
    const m = parts.screen;
    const original = m.material;
    m.material = crt.phosphor;
    const glass = new THREE.Mesh(m.geometry, crt.glass);
    glass.position.z = 0.003;
    m.add(glass);
    const led = parts.led.material as THREE.MeshStandardMaterial;
    led.emissive.set("#ff5a1f");
    return () => {
      m.material = original;
      glass.removeFromParent();
    };
  }, [parts, crt]);
  useEffect(
    () => () => {
      crt.tex.dispose();
      crt.phosphor.dispose();
      crt.glass.dispose();
    },
    [crt],
  );

  const sim = useRef({
    tilt: { x: 0, y: 0, vx: 0, vy: 0 },
    keys: Object.fromEntries(KEYS.map((k) => [k, { z: 0, v: 0 }])) as Record<KeyId, { z: number; v: number }>,
    lever: { x: -0.085, v: 0 },
    knob: 0,
    kick: 0,
    drawn: -1,
    ready: false,
    rects: {} as Partial<Record<ControlId, string>>,
  });
  const box = useMemo(() => new THREE.Box3(), []);
  const v = useMemo(() => new THREE.Vector3(), []);

  const invalidate = useThree((st) => st.invalidate);
  const gl = useThree((st) => st.gl);
  const scene = useThree((st) => st.scene);
  const camera = useThree((st) => st.camera);
  useEffect(() => {
    // anything the visitor does draws every frame for a moment (springs, puffs, readouts)
    rig.invalidate = () => {
      rig.hot = performance.now() + 250;
      invalidate();
    };
    invalidate();
    return () => {
      rig.invalidate = () => {};
    };
  }, [rig, invalidate]);

  // Compile every shader before the first frame, in parallel and off the main thread where the browser
  // can (KHR_parallel_shader_compile). Drawing first made the GPU driver compile them one by one on
  // the main thread: the page froze for ~1s on a laptop, ~1.75s on a mid-range phone.
  useEffect(() => {
    let gone = false;
    // With bloom on, the scene is drawn into the composer's buffer, not the screen, and three builds a
    // different variant of every shader for that (linear output, no tone mapping): compile with a
    // render target bound so the variants match. compile() reads that state synchronously.
    const rt = post ? new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }) : null;
    const prev = gl.getRenderTarget();
    gl.setRenderTarget(rt);
    const done = gl.compileAsync(scene, camera);
    gl.setRenderTarget(prev);
    done
      .catch(() => {})
      .finally(() => {
        rt?.dispose();
        if (!gone) onWarm();
      });
    return () => {
      gone = true;
    };
  }, [gl, scene, camera, post, onWarm]);

  // At rest (the float, the cable's sway, the CRT) 30 fps reads the same and halves the GPU and main
  // thread cost; useFrame keeps drawing every frame while anything actually moves.
  useEffect(() => {
    if (!paced) return;
    let raf = 0;
    let last = 0;
    // by time, not every other frame, so 120 Hz screens (and headless Chrome) idle at 30 too
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 29) return;
      last = now;
      invalidate();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paced, invalidate]);

  useFrame((state: RootState, delta: number) => {
    const g = group.current;
    if (!g) return;
    const S = sim.current;
    const dt = Math.min(delta, 1 / 30);
    const t = state.clock.elapsedTime;
    const motion = !rig.reduced;
    const { size } = state;
    const cam = state.camera as THREE.PerspectiveCamera;

    // ── fit the device into the DOM anchor box ──
    const visH = 2 * cam.position.z * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const k = visH / Math.max(1, size.height);
    const a = rig.anchor ?? { x: 0, y: 0, w: size.width, h: size.height };
    const F = fit.current;
    F.visH = visH;
    F.visW = visH * (size.width / Math.max(1, size.height));
    F.cx = (a.x + a.w / 2 - size.width / 2) * k;
    F.cy = -(a.y + a.h / 2 - size.height / 2) * k;
    F.s = Math.min((a.w * k) / VIEW.w, (a.h * k) / VIEW.h) * (dark ? 1.05 : 1);

    // ── pose: base three-quarter, tilt toward the cursor, idle float, chaos jitter ──
    let tx = 0;
    let ty = 0;
    if (motion && !coarse && pointer.inside) {
      tx = clamp(((pointer.x - (size.left + a.x + a.w / 2)) / window.innerWidth) * 2.4, -1, 1);
      ty = clamp(((pointer.y - (size.top + a.y + a.h / 2)) / window.innerHeight) * 2.4, -1, 1);
    }
    // under-damped spring (ζ ≈ 0.6): the device leans toward the cursor and settles with a little sway
    const T = S.tilt;
    if (motion) {
      const damp = Math.exp(-7.5 * dt);
      T.vx = (T.vx + (tx - T.x) * 38 * dt) * damp;
      T.vy = (T.vy + (ty - T.y) * 38 * dt) * damp;
      T.x += T.vx * dt;
      T.y += T.vy * dt;
    } else {
      T.x = tx;
      T.y = ty;
    }
    g.rotation.set(-0.07 + S.tilt.y * 0.16, -0.2 + S.tilt.x * 0.26, motion ? Math.sin(t * 0.55) * 0.012 : 0);
    g.position.set(F.cx, F.cy + (motion ? Math.sin(t * 0.9) * 0.022 * F.s : 0) + rig.drop * visH, 0);
    g.scale.setScalar(F.s);
    if (rig.chaos && motion) {
      S.kick *= Math.exp(-dt * 5);
      if (Math.random() < dt * 0.9) S.kick = 1;
      const j = (0.007 + S.kick * 0.04) * F.s;
      g.position.x += (Math.random() - 0.5) * j;
      g.position.y += (Math.random() - 0.5) * j;
      g.rotation.z += (Math.random() - 0.5) * 0.05 * (0.25 + S.kick);
    }

    // ── keys: hover lifts, press travels, the active mode stays latched halfway ──
    for (const id of KEYS) {
      const sp = S.keys[id];
      const target = rig.down === id ? -0.05 : rig.mode === id ? -0.026 : rig.hover === id ? 0.018 : 0;
      if (motion) {
        sp.v += (target - sp.z) * 900 * dt;
        sp.v *= Math.exp(-24 * dt);
        sp.z += sp.v * dt;
      } else sp.z = target;
      const o = parts.keys[id];
      o.position.z = (o.userData.p0 as THREE.Vector3).z + sp.z;
    }
    const ka = (0.5 - rig.knob) * Math.PI * 1.5;
    S.knob = motion ? S.knob + (ka - S.knob) * (1 - Math.exp(-dt * 18)) : ka;
    parts.knob.rotation.z = S.knob;
    parts.knob.position.z = (parts.knob.userData.p0 as THREE.Vector3).z + (rig.hover === "knob" ? 0.008 : 0);
    const lx = rig.chaos ? 0.085 : -0.085;
    if (motion) {
      S.lever.v += (lx - S.lever.x) * 520 * dt;
      S.lever.v *= Math.exp(-11 * dt);
      S.lever.x += S.lever.v * dt;
    } else S.lever.x = lx;
    parts.lever.position.x = S.lever.x;
    const led = parts.led.material as THREE.MeshStandardMaterial;
    led.emissiveIntensity = rig.chaos ? 2.4 + (motion ? Math.random() * 0.8 : 0) : 0.05;

    // ── shadow: a soft pool under the floating device; it tightens as the device comes down ──
    const sh = shadow.current;
    if (sh && pool.current && core.current) {
      const lift = rig.drop * 3 + (motion ? (Math.sin(t * 0.9) + 1) * 0.5 : 0.5);
      sh.position.set(F.cx + S.tilt.x * 0.05 * F.s, F.cy - 0.82 * F.s, -0.28 * F.s);
      sh.scale.set(F.s * (1 + lift * 0.06), F.s, F.s);
      pool.current.material.opacity = (dark ? 0.55 : 0.3) * Math.max(0, 1 - rig.drop * 1.6);
      core.current.material.opacity = (dark ? 0.6 : 0.36) * Math.max(0, 1 - rig.drop * 2.5) * (1 - lift * 0.18);
    }

    // ── DOM hit areas follow the projected parts ──
    g.updateMatrixWorld(true);
    const place = (id: ControlId, obj: THREE.Object3D) => {
      const el = rig.els[id];
      if (!el) return;
      box.setFromObject(obj);
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let i = 0; i < 8; i++) {
        v.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(cam);
        const x = (v.x * 0.5 + 0.5) * size.width;
        const y = (-v.y * 0.5 + 0.5) * size.height;
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
      // Position follows the tilt every frame through transform (no layout). Width/height are layout
      // properties inside a size container: writing them every frame restyled the whole hero
      // (including the hidden SVG fallback) per frame, so they're whole-pixel and change-only.
      const pos = `${Math.round(x0 * 2) / 2},${Math.round(y0 * 2) / 2}`;
      const dim = `${Math.round(x1 - x0)},${Math.round(y1 - y0)}`;
      const [prevPos, prevDim] = (S.rects[id] ?? "|").split("|");
      if (prevPos === pos && prevDim === dim) return;
      S.rects[id] = `${pos}|${dim}`;
      if (prevPos !== pos) {
        const [tx, ty] = pos.split(",");
        el.style.transform = `translate(${tx}px, ${ty}px)`;
      }
      if (prevDim !== dim) {
        const [w, h] = dim.split(",");
        el.style.width = `${w}px`;
        el.style.height = `${h}px`;
      }
    };
    for (const id of KEYS) place(id, parts.keys[id]);
    place("knob", parts.knob);
    place("switch", parts.sw);

    // ── CRT at ≤ 30 fps ──
    if (!motion || t - S.drawn >= 1 / 31) {
      S.drawn = t;
      crt.screen.draw(performance.now());
      crt.tex.needsUpdate = true;
    }
    if (!S.ready) {
      S.ready = true;
      requestAnimationFrame(onReady);
    }

    // still moving? then the next frame too, not just the next 30 fps tick
    const e = 0.0015;
    let moving = (rig.chaos && motion) || (rig.drop > 0 && rig.drop < 1) || rig.power < 1;
    moving ||= Math.abs(T.vx) + Math.abs(T.vy) > e || Math.abs(tx - T.x) + Math.abs(ty - T.y) > e;
    moving ||= Math.abs(S.lever.v) > e || Math.abs(lx - S.lever.x) > e * 0.2 || Math.abs(ka - S.knob) > e;
    for (const id of KEYS) moving ||= Math.abs(S.keys[id].v) > e || Math.abs(S.keys[id].z - (rig.down === id ? -0.05 : rig.mode === id ? -0.026 : rig.hover === id ? 0.018 : 0)) > e * 0.2;
    const now = performance.now();
    if (moving) rig.hot = now + 120;
    if (now < rig.hot && motion) invalidate();
  });

  return (
    <>
      <Lights dark={dark} />
      <group ref={group}>
        <primitive object={model} />
        <Cable rig={rig} socket={parts.socket} fit={fit} />
        <Puffs rig={rig} keys={parts.keys} />
      </group>
      {/* Seen head-on, a ground contact shadow is edge-on; a soft pool behind the base reads right. */}
      <group ref={shadow}>
        <Shadow ref={pool} rotation={[0, 0, 0]} scale={[3.1, 0.62, 1]} color={dark ? "#000000" : "#3a2716"} colorStop={0} opacity={0.3} />
        <Shadow ref={core} rotation={[0, 0, 0]} position={[0, 0.02, 0.01]} scale={[2.3, 0.2, 1]} color={dark ? "#000000" : "#24170c"} colorStop={0.25} opacity={0.36} />
      </group>
      {post ? <Post selection={[parts.screen, parts.led]} dark={dark} /> : null}
    </>
  );
}

// memo: drei's <Environment> re-renders its cube map whenever its children change identity,
// i.e. on every parent render. Only a theme change should do that.
const Lights = memo(function Lights({ dark }: { dark: boolean }) {
  return (
    <>
      <directionalLight position={[-3, 5, 6]} intensity={dark ? 0.7 : 1.15} color="#fff3e4" />
      {dark ? <directionalLight position={[5, 1.5, -3]} intensity={2.4} color="#ff6a2a" /> : null}
      <Environment resolution={256} frames={1} environmentIntensity={dark ? 0.45 : 1}>
        <color attach="background" args={[dark ? "#100e0c" : "#4d4740"]} />
        <Lightformer form="rect" intensity={2.4} color="#fff5e8" position={[0, 4.5, 5]} rotation={[-Math.PI / 3, 0, 0]} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={1.1} position={[-6, 1, 3]} rotation={[0, Math.PI / 2.6, 0]} scale={[5, 7, 1]} />
        <Lightformer form="rect" intensity={1.7} position={[6, 1.5, 1]} rotation={[0, -Math.PI / 2, 0]} scale={[3, 9, 1]} />
        <Lightformer form="circle" intensity={0.8} color="#ff8a4c" position={[1.5, -4, 3]} rotation={[Math.PI / 2.4, 0, 0]} scale={3} />
      </Environment>
    </>
  );
});

function Post({ selection, dark }: { selection: THREE.Object3D[]; dark: boolean }) {
  const light = useRef<THREE.AmbientLight>(null);
  const lights = useMemo(() => [light], []);
  return (
    <>
      {/* SelectiveBloom wants a light on its layer; the phosphor is unlit, so this one is dark. */}
      <ambientLight ref={light} intensity={0} />
      <EffectComposer multisampling={2}>
        <SelectiveBloom
          selection={selection}
          lights={lights}
          intensity={dark ? 1.7 : 1.15}
          luminanceThreshold={0.06}
          luminanceSmoothing={0.3}
          mipmapBlur
          radius={0.72}
        />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      </EffectComposer>
    </>
  );
}

/* ── the orange cable: a tube from the socket off the canvas edge, swaying in the vertex shader ── */
function Cable({ rig, socket, fit }: { rig: Rig; socket: THREE.Object3D; fit: React.RefObject<Fit> }) {
  const mesh = useRef<THREE.Mesh>(null);
  const built = useRef({ ex: -1e9, ey: -1e9 });
  const { material, uniforms } = useMemo(() => {
    const uniforms = { uTime: { value: 0 }, uAmp: { value: 1 } };
    const material = new THREE.MeshPhysicalMaterial({ color: "#ff5a1f", roughness: 0.36, clearcoat: 0.6, clearcoatRoughness: 0.3 });
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader =
        "uniform float uTime;\nuniform float uAmp;\n" +
        shader.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          float cs = smoothstep(0.04, 0.55, uv.x);
          transformed += vec3(
            sin(uTime * 1.3 + uv.x * 6.0),
            sin(uTime * 0.9 + uv.x * 5.0 + 1.7) * 0.6,
            cos(uTime * 1.1 + uv.x * 4.0)
          ) * 0.05 * cs * uAmp;`,
        );
    };
    material.customProgramCacheKey = () => "hero-cable";
    return { material, uniforms };
  }, []);
  useEffect(() => {
    const m = mesh.current; // the ref is already null by the time a passive cleanup runs
    return () => {
      material.dispose();
      m?.geometry.dispose(); // the latest tube (useFrame swaps it on resize)
    };
  }, [material]);

  const swing = useRef({ t: 0, whip: 0 });
  // window.scrollY forces a synchronous layout when anything changed layout this frame (the kinetic
  // headline always has), so the "is the canvas at the top of the page" test runs twice a second.
  const top = useRef({ open: true, n: 0 });
  useFrame((state, delta) => {
    const m = mesh.current;
    const F = fit.current;
    if (!m || !F) return;
    if (top.current.n++ % 30 === 0) top.current.open = state.size.top + window.scrollY < 4;
    // Rebuild the tube only when the frame changes (resize), never per frame. The canvas edges in
    // device units decide the route: where the canvas starts at the top of the page the cable may
    // leave through the top edge; anywhere else it arcs under it and leaves through the right edge.
    const s0 = socket.userData.p0 as THREE.Vector3;
    const topEdge = (F.visH / 2 - F.cy) / F.s;
    const right = (F.visW / 2 - F.cx) / F.s;
    const open = top.current.open;
    const peak = open ? s0.y + 0.44 : Math.max(s0.y + 0.06, Math.min(s0.y + 0.44, topEdge - 0.14));
    const ex = Math.max(1.7, right + 0.5);
    const ey = open ? Math.min(2.6, Math.max(1.35, topEdge + 0.3)) : Math.max(s0.y, Math.min(peak + 0.4, topEdge - 0.1));
    const b = built.current;
    if (Math.abs(ex - b.ex) > 0.04 || Math.abs(ey - b.ey) > 0.04) {
      b.ex = ex;
      b.ey = ey;
      const E = new THREE.Vector3(ex, ey, -0.55);
      const s2 = new THREE.Vector3(s0.x + 0.16, peak, -0.12);
      const mid = s2.clone().lerp(E, 0.45).add(new THREE.Vector3(0, -0.16, -0.1));
      const s1 = new THREE.Vector3(s0.x, s0.y + (peak - s0.y) * 0.45, -0.06);
      const curve = new THREE.CatmullRomCurve3([s0.clone(), s1, s2, mid, E], false, "centripetal");
      const old = m.geometry;
      m.geometry = new THREE.TubeGeometry(curve, 110, 0.03, 10, false);
      old.dispose();
    }
    const sw = swing.current;
    const dt = Math.min(delta, 1 / 30);
    const chaos = rig.chaos && !rig.reduced;
    if (chaos && Math.random() < dt * 1.4) sw.whip = 1;
    sw.whip *= Math.exp(-dt * 4);
    sw.t += rig.reduced ? 0 : dt * (chaos ? 3.2 : 1) * (1 + sw.whip * 3);
    uniforms.uTime.value = sw.t;
    uniforms.uAmp.value = rig.reduced ? 0 : chaos ? 2.4 + sw.whip * 5 : 1;
  });

  return <mesh ref={mesh} material={material} frustumCulled={false} />;
}

/* ── particle puff when a key is pressed ── */
const N = 90;
function Puffs({ rig, keys }: { rig: Rig; keys: Record<KeyId, THREE.Object3D> }) {
  const { geometry, ps, sprite } = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(N * 4), 4));
    const ps = Array.from({ length: N }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0, max: 1, warm: true }));
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const x = c.getContext("2d")!;
    const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.5, "rgba(255,255,255,0.7)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 32, 32);
    const sprite = new THREE.CanvasTexture(c);
    return { geometry, ps, sprite };
  }, []);
  useEffect(
    () => () => {
      geometry.dispose();
      sprite.dispose();
    },
    [geometry, sprite],
  );
  const seen = useRef<Record<KeyId, number>>({ ...rig.pressed });
  const cursor = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);
    for (const id of KEYS) {
      if (rig.pressed[id] === seen.current[id]) continue;
      seen.current[id] = rig.pressed[id];
      if (rig.reduced) continue;
      const origin = (keys[id].userData.p0 as THREE.Vector3).clone().add(new THREE.Vector3(0, 0, 0.1));
      for (let n = 0; n < 18; n++) {
        const q = ps[cursor.current++ % N];
        const a = Math.random() * Math.PI * 2;
        q.p.copy(origin).add(new THREE.Vector3(Math.cos(a) * 0.1, Math.sin(a) * 0.08, 0));
        q.v.set(Math.cos(a) * (0.5 + Math.random() * 0.7), Math.sin(a) * 0.5 + 0.45 + Math.random() * 0.4, 0.4 + Math.random() * 0.6);
        q.max = q.life = 0.45 + Math.random() * 0.4;
        q.warm = Math.random() < 0.7;
      }
    }
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const col = geometry.attributes.color as THREE.BufferAttribute;
    let any = false;
    ps.forEach((q, i) => {
      if (q.life > 0) {
        any = true;
        q.life -= dt;
        q.v.y -= 2.2 * dt;
        q.v.multiplyScalar(Math.exp(-2.5 * dt));
        q.p.addScaledVector(q.v, dt);
      }
      const a = Math.max(0, q.life / q.max);
      pos.setXYZ(i, q.p.x, q.p.y, q.p.z);
      if (q.warm) col.setXYZW(i, 1, 0.36, 0.12, a);
      else col.setXYZW(i, 0.98, 0.93, 0.85, a);
    });
    if (any || pos.version === 0) {
      pos.needsUpdate = true;
      col.needsUpdate = true;
    }
    if (any) rig.hot = performance.now() + 60;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <pointsMaterial size={0.075} map={sprite} vertexColors transparent depthWrite={false} sizeAttenuation />
    </points>
  );
}
