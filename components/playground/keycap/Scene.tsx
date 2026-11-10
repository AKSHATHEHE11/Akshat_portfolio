"use client";
// The keycap in 3D. Loaded with next/dynamic(ssr:false) from Keycap.tsx — never import it directly.
// Every motion reads the shared KeyRig inside useFrame; React renders this once.
import { Suspense, memo, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, Shadow, useGLTF } from "@react-three/drei";
import { drawLegend, type KeyRig } from "./rig";

const MODEL = "/models/keycap.glb";
useGLTF.preload(MODEL);

const CENTRE = 0.42; // spin about the cap's middle, not its base
const TRAVEL = 0.2;
const REST_YAW = 0.5; // a three-quarter view shows the sculpt
const GLITCH = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&?!/<>";
const SKINS = ["#ece5d8", "#ff5a1f", "#d8ff00", "#1b1b1b"];

export interface SceneProps {
  rig: KeyRig;
  active: boolean;
  coarse: boolean;
  onReady: () => void;
  onLost: () => void;
}

export default memo(function Scene({ rig, active, coarse, onReady, onLost }: SceneProps) {
  const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, coarse ? 1.25 : 1.5);
  return (
    <Canvas
      aria-hidden
      frameloop={active ? "always" : "never"}
      dpr={dpr}
      camera={{ fov: 24, position: [0, 3.65, 5.45], near: 1, far: 20 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance", toneMapping: THREE.NeutralToneMapping }}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      onCreated={({ gl, camera }) => {
        camera.lookAt(0, 0.34, 0);
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          onLost();
        });
      }}
    >
      <Suspense fallback={null}>
        <Stage rig={rig} onReady={onReady} />
      </Suspense>
    </Canvas>
  );
});

function Stage({ rig, onReady }: { rig: KeyRig; onReady: () => void }) {
  const { scene: model } = useGLTF(MODEL);
  const spin = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>>(null);

  const parts = useMemo(() => {
    const get = (n: string) => {
      const o = model.getObjectByName(n);
      if (!o) throw new Error(`keycap.glb is missing "${n}"`);
      return o;
    };
    return { key: get("keycap"), cap: get("cap") as THREE.Mesh, plate: get("legend_plate") as THREE.Mesh };
  }, [model]);

  // the legend: a CanvasTexture on the plate that sits on the dish
  const legend = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const material = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      roughness: 0.62,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-archivo").trim() || "sans-serif";
    return { ctx, tex, material, family };
  }, []);

  useEffect(() => {
    const plate = parts.plate;
    const original = plate.material;
    plate.material = legend.material;
    const cap = parts.cap.material as THREE.MeshStandardMaterial;
    const base = cap.color.clone();
    return () => {
      plate.material = original;
      cap.color.copy(base);
    };
  }, [parts, legend]);
  useEffect(
    () => () => {
      legend.tex.dispose();
      legend.material.dispose();
    },
    [legend],
  );

  const sim = useRef({ pitch: 0, vp: 0, y: 0, vy: 0, drawn: "", font: false, glitchUntil: 0, nextGlitch: 0, skin: 0, ready: false });

  useEffect(() => {
    // redraw once Archivo has arrived (the first draw may have used the fallback face)
    void document.fonts.load(`800 64px ${legend.family}`).then(() => {
      sim.current.font = true;
      sim.current.drawn = "";
    });
  }, [legend]);

  useFrame((state, delta) => {
    const g = spin.current;
    if (!g) return;
    const S = sim.current;
    const dt = Math.min(delta, 1 / 30);
    const t = state.clock.elapsedTime;
    const now = performance.now();

    // yaw: dragging writes it directly; released it coasts, then a soft spring brings the face home
    if (!rig.drag) {
      if (Math.abs(rig.vyaw) > 1.1) {
        rig.yaw += rig.vyaw * dt;
        rig.vyaw *= Math.exp(-1.6 * dt);
      } else {
        const home = Math.round((rig.yaw - REST_YAW) / (Math.PI * 2)) * Math.PI * 2 + REST_YAW + Math.sin(t * 0.55) * 0.16;
        rig.vyaw += (home - rig.yaw) * 7 * dt;
        rig.vyaw *= Math.exp(-3.2 * dt);
        rig.yaw += rig.vyaw * dt;
      }
    }
    S.vp += (rig.pitchTarget - S.pitch) * 140 * dt;
    S.vp *= Math.exp(-14 * dt);
    S.pitch += S.vp * dt;
    g.rotation.set(0.12 + S.pitch, rig.yaw, 0);

    // press: down fast, back up with a little overshoot
    const target = now - rig.press < 110 ? -TRAVEL : 0;
    S.vy += (target - S.y) * 1300 * dt;
    S.vy *= Math.exp(-26 * dt);
    S.y += S.vy * dt;
    parts.key.position.y = S.y;
    const sh = shadow.current;
    if (sh) {
      sh.material.opacity = 0.55 + (-S.y / TRAVEL) * 0.2;
      sh.scale.setScalar(2.9 + S.y * 0.8);
    }

    // chaos: the legend glitches now and then, and a press can repaint the plastic
    let text = rig.legend;
    if (rig.chaos) {
      if (now > S.nextGlitch) {
        S.glitchUntil = now + 340;
        S.nextGlitch = now + 900 + Math.random() * 1800;
      }
      if (now < S.glitchUntil) text = GLITCH[Math.floor((now / 60) % GLITCH.length)] ?? text;
      if (now - rig.press < 20) {
        S.skin = (S.skin + 1) % SKINS.length;
        (parts.cap.material as THREE.MeshStandardMaterial).color.set(SKINS[S.skin]);
      }
    } else if (S.skin) {
      S.skin = 0;
      (parts.cap.material as THREE.MeshStandardMaterial).color.set(SKINS[0]);
    }
    if (text !== S.drawn) {
      S.drawn = text;
      drawLegend(legend.ctx, text, legend.family);
      legend.tex.needsUpdate = true;
    }

    if (!S.ready) {
      S.ready = true;
      requestAnimationFrame(onReady);
    }
  });

  return (
    <>
      <Lights />
      <group position={[0, CENTRE, 0]}>
        <group ref={spin}>
          <primitive object={model} position={[0, -CENTRE, 0]} />
        </group>
      </group>
      <Shadow ref={shadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} scale={2.9} color="#000000" colorStop={0.1} opacity={0.55} />
    </>
  );
}

// memo: <Environment> re-captures its cube map whenever its children change identity.
const Lights = memo(function Lights() {
  return (
    <>
      <directionalLight position={[-2.5, 5, 4]} intensity={1.6} color="#fff3e4" />
      <ambientLight intensity={0.2} />
      <Environment resolution={128} frames={1} environmentIntensity={1}>
        {/* a warm mid-grey studio: a dark backdrop made the cream PBT read as tan */}
        <color attach="background" args={["#9a9286"]} />
        <Lightformer form="rect" intensity={2.6} color="#fff5e8" position={[0, 5, 3]} rotation={[-Math.PI / 2.6, 0, 0]} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-5, 1.5, 2]} rotation={[0, Math.PI / 2.4, 0]} scale={[4, 6, 1]} />
        <Lightformer form="rect" intensity={1.8} color="#ff7a3c" position={[4, 1, -4]} rotation={[0, -Math.PI / 1.4, 0]} scale={[3, 6, 1]} />
      </Environment>
    </>
  );
});
