"use client";
// EXP-02, the WebGL half: one THREE.Points drawn straight in clip space from the simulation's own
// position array (no camera, no copies — the typed arrays ARE the attributes). Mounted only while the
// specimen is switched on, so the page never holds more than one WebGL context.
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { dprCap } from "../shared";
import { useWake } from "../wake";
import { step, type Gust, type Input, type Sim, type Tune } from "./sim";

const VERT = /* glsl */ `
  uniform vec2 uView; uniform float uDpr; uniform float uTime; uniform float uIdle;
  attribute float aHeat; attribute float aRow;
  varying float vHeat;
  void main() {
    vec2 p = position.xy;
    p.y += sin(uTime * 0.8 + aRow * 0.37 + p.x * 0.006) * 1.6 * uIdle * (1.0 - aHeat);
    gl_Position = vec4(p.x / uView.x * 2.0 - 1.0, 1.0 - p.y / uView.y * 2.0, 0.0, 1.0);
    gl_PointSize = (1.5 + aHeat * 1.6) * uDpr;
    vHeat = aHeat;
  }`;
const FRAG = /* glsl */ `
  uniform vec3 uCold; uniform vec3 uWarm; uniform vec3 uHot;
  varying float vHeat;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    if (dot(c, c) > 0.25) discard;
    vec3 col = mix(uCold, uWarm, smoothstep(0.08, 0.5, vHeat));
    col = mix(col, uHot, smoothstep(0.85, 1.0, vHeat));
    gl_FragColor = vec4(col, mix(0.42, 1.0, smoothstep(0.0, 0.35, vHeat)));
    #include <colorspace_fragment>
  }`;

export interface FieldProps {
  sim: RefObject<Sim | null>;
  gusts: RefObject<Gust[]>;
  /** pointer (+ chaos gusts) for this frame */
  read: () => Input;
  tune: Tune;
  host: RefObject<HTMLDivElement | null>;
  reduced: boolean;
  coarse: boolean;
  /** after each simulated frame (readout) */
  onFrame: (s: Sim) => void;
  /** first frame is on screen: the 2D still can step aside */
  onReady: () => void;
}

export default function Field(props: FieldProps) {
  return (
    <Canvas
      aria-hidden
      dpr={dprCap(props.coarse)}
      frameloop={props.reduced ? "demand" : "always"}
      gl={{ alpha: true, antialias: false, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <Points {...props} />
    </Canvas>
  );
}

function Points({ sim, gusts, read, tune, host, reduced, onFrame, onReady }: FieldProps) {
  useWake(host);
  const geo = useMemo(() => new THREE.BufferGeometry(), []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uView: { value: new THREE.Vector2(1, 1) },
          uDpr: { value: 1 },
          uTime: { value: 0 },
          uIdle: { value: 0 },
          uCold: { value: new THREE.Color("#f2eee7") },
          uWarm: { value: new THREE.Color("#ff5a1f") },
          uHot: { value: new THREE.Color("#d8ff00") },
        },
      }),
    [],
  );
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  const bound = useRef<Sim | null>(null);
  const ready = useRef(false);

  useFrame((state, delta) => {
    const s = sim.current;
    if (!s) return;
    if (bound.current !== s) {
      // resize / chaos rebuilt the field: drop the old GPU buffers, bind the new arrays
      geo.dispose();
      geo.setAttribute("position", new THREE.BufferAttribute(s.pos, 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute("aHeat", new THREE.BufferAttribute(s.heat, 1).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute("aRow", new THREE.BufferAttribute(s.row, 1));
      mat.uniforms.uView.value.set(s.w, s.h);
      bound.current = s;
      s.awake = true;
    }
    const u = mat.uniforms;
    u.uDpr.value = state.viewport.dpr;
    u.uTime.value = state.clock.elapsedTime;
    u.uIdle.value = reduced ? 0 : 1;
    if (step(s, read(), gusts.current, tune, Math.min(delta, 1 / 30))) {
      geo.attributes.position.needsUpdate = true;
      geo.attributes.aHeat.needsUpdate = true;
      onFrame(s);
      if (reduced && s.awake) state.invalidate();
    }
    if (!ready.current) {
      ready.current = true;
      onReady();
    }
  });

  return <points geometry={geo} material={mat} frustumCulled={false} />;
}
