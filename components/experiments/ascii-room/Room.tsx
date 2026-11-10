"use client";
// EXP-06, the WebGL half: the site's own console (public/models/console.glb) on a lit floor, with a
// few loose keycaps in orbit, rendered through drei's AsciiRenderer at 30 fps. The WebGL canvas
// itself is never shown — only the characters. Mounted only while the specimen is switched on.
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AsciiRenderer, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useWake } from "../wake";
import { REST } from "./still";

const CONSOLE = "/models/console.glb";
const KEYCAP = "/models/keycap.glb";

/** Orbit state shared with the DOM handlers in AsciiRoom.tsx (rad, rad/s). */
export interface Orbit {
  yaw: number;
  pitch: number;
  /** yaw velocity */
  vy: number;
  drag: boolean;
}

export interface RoomProps {
  orbit: RefObject<Orbit>;
  host: RefObject<HTMLDivElement | null>;
  /** receives the AsciiEffect's <table> — the still frame is read from it when the room switches off */
  tableRef: RefObject<HTMLTableElement | null>;
  /** characters per CSS px, sized for the box (still.ts) */
  resolution: number;
  chaos: boolean;
  reduced: boolean;
  onReady: () => void;
}

export default function Room(props: RoomProps) {
  const { chaos, resolution, onReady } = props;
  // drei's AsciiRenderer sizes each new effect in a passive effect, and a frame drawn before that
  // throws (getImageData on an unsized canvas) — on mount and whenever chaos swaps the characters or
  // the box changes the grid. So no frames run until Grab, mounted after it, reports in for this effect.
  const effect = `${chaos}:${resolution}`;
  const [armed, setArmed] = useState<string | null>(null);
  const arm = useCallback(
    (key: string) => {
      setArmed(key);
      onReady();
    },
    [onReady],
  );
  return (
    <Canvas
      aria-hidden
      // only the ~0.17× downsample reaches the characters: rendering at full resolution is wasted work
      dpr={0.5}
      // "demand", paced by Scene: every frame rewrites thousands of characters of DOM, so the room
      // turns at 30 fps (a terminal's cadence anyway), drags included
      frameloop={armed === effect ? "demand" : "never"}
      camera={{ fov: 32, position: [0, 1.6, 5.4], near: 0.1, far: 40 }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <color attach="background" args={["#000000"]} />
      <Suspense fallback={null}>
        <Scene {...props} />
        <AsciiRenderer
          fgColor={chaos ? "#d8ff00" : "#ff5a1f"}
          bgColor="#0b0b0a"
          // two spaces at the dark end: the unlit floor stays blank instead of a field of dots
          characters={chaos ? "  .:01#@" : "  .:-=+*#%@"}
          invert
          resolution={resolution}
        />
        <Grab tableRef={props.tableRef} effect={effect} onArm={arm} />
      </Suspense>
    </Canvas>
  );
}

/** Runs after AsciiRenderer has put its (sized) table into the DOM — on mount and for every new effect. */
function Grab({ tableRef, effect, onArm }: { tableRef: RoomProps["tableRef"]; effect: string; onArm: (key: string) => void }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    tableRef.current = gl.domElement.parentElement?.querySelector("table") ?? null;
    // arming changes the frameloop, and any store change invalidates: "demand" gets its first frame too
    onArm(effect);
  }, [gl, tableRef, effect, onArm]);
  return null;
}

type Face = "calm" | "wink" | "dizzy" | "sad" | "glitch";

/** The console's screen: a face drawn in thick strokes — at ~20 characters across, type would not read. */
function useFace() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 360;
    canvas.height = 245;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    let shown = "";
    const draw = (face: Face) => {
      const g = canvas.getContext("2d");
      if (face === shown || !g) return;
      shown = face;
      g.fillStyle = "#000";
      g.fillRect(0, 0, 360, 245);
      g.fillStyle = g.strokeStyle = "#fff4ea";
      g.lineWidth = 30;
      g.lineCap = "round";
      const eye = (x: number, shut: boolean) => {
        g.beginPath();
        if (face === "glitch") {
          g.moveTo(x - 24, 56);
          g.lineTo(x + 24, 104);
          g.moveTo(x + 24, 56);
          g.lineTo(x - 24, 104);
          g.stroke();
        } else if (shut) {
          g.moveTo(x - 26, 82);
          g.lineTo(x + 26, 82);
          g.stroke();
        } else {
          g.arc(x, 80, 26, 0, Math.PI * 2);
          g.fill();
        }
      };
      eye(118, false);
      eye(242, face === "wink");
      g.beginPath();
      if (face === "dizzy") g.arc(180, 170, 34, 0, Math.PI * 2);
      else if (face === "sad" || face === "glitch") g.arc(180, 222, 64, Math.PI * 1.18, Math.PI * 1.82);
      else g.arc(180, 112, 82, Math.PI * 0.2, Math.PI * 0.8);
      g.stroke();
      tex.needsUpdate = true;
    };
    draw("calm");
    return { tex, draw };
  }, []);
}

interface Cap {
  r: number;
  y: number;
  speed: number;
  phase: number;
  spin: number;
}
const CAPS: Cap[] = [
  { r: 2.05, y: 0.55, speed: 0.32, phase: 0.4, spin: 0.9 },
  { r: 2.4, y: -0.2, speed: 0.24, phase: 2.1, spin: -0.7 },
  { r: 1.85, y: 1.05, speed: 0.4, phase: 3.6, spin: 1.3 },
  { r: 2.6, y: 0.3, speed: 0.2, phase: 5.0, spin: -1.1 },
];

function Scene({ orbit, host, chaos, reduced }: RoomProps) {
  // moving: the 30 fps clock below is the only pace; reduced motion: input asks for each frame
  useWake(host, reduced);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => invalidate(), 1000 / 30);
    return () => window.clearInterval(id);
  }, [reduced, invalidate]);
  const { scene: model } = useGLTF(CONSOLE, false, false);
  const { scene: capModel } = useGLTF(KEYCAP, false, false);
  const face = useFace();

  const parts = useMemo(() => {
    const root = model.clone(true);
    const keys: THREE.Object3D[] = [];
    let knob: THREE.Object3D | null = null;
    root.traverse((o) => {
      if (o.name.startsWith("key_")) keys.push(o);
      if (o.name === "knob") knob = o;
      if (o.name === "screen" && o instanceof THREE.Mesh) o.material = new THREE.MeshBasicMaterial({ map: face.tex });
    });
    const caps = CAPS.map(() => {
      const c = capModel.clone(true);
      c.getObjectByName("legend_plate")?.removeFromParent();
      c.scale.setScalar(0.22);
      return c;
    });
    return { root, keys, keysZ: keys.map((k) => k.position.z), press: keys.map(() => ({ z: 0, v: 0 })), knob: knob as THREE.Object3D | null, caps };
  }, [model, capModel, face]);

  // The clones share geometry and materials with useGLTF's cache, and three hangs a dispose listener on
  // each one that holds the whole renderer — so without this every past room (and its WebGL context)
  // stays alive. Disposing frees this renderer's buffers and those listeners; the cache re-uploads next time.
  useEffect(
    () => () => {
      face.tex.dispose();
      const used = new Set<THREE.BufferGeometry | THREE.Material>();
      for (const o of [parts.root, ...parts.caps])
        o.traverse((m) => {
          if (!(m instanceof THREE.Mesh)) return;
          used.add(m.geometry);
          for (const x of [m.material].flat()) used.add(x);
        });
      used.forEach((x) => x.dispose());
    },
    [face, parts],
  );

  const clock = useRef({ nextKey: 0, wink: 0 });

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const t = state.clock.elapsedTime;
    const o = orbit.current;
    const motion = !reduced;

    // ── orbit: inertia after a drag, drifting back to a slow turntable ──
    if (!o.drag) {
      if (motion) {
        o.vy += ((chaos ? 0.9 : 0.16) - o.vy) * (1 - Math.exp(-1.1 * dt));
        o.pitch += (REST.pitch - o.pitch) * (1 - Math.exp(-0.6 * dt));
      } else o.vy = 0;
      o.yaw += o.vy * dt;
    }
    const { width, height } = state.size;
    const R = 4.7 / Math.min(1, width / Math.max(1, height) / 1.35);
    const cp = Math.cos(o.pitch);
    state.camera.position.set(Math.sin(o.yaw) * cp * R, 0.05 + Math.sin(o.pitch) * R, Math.cos(o.yaw) * cp * R);
    state.camera.lookAt(0, -0.08, 0);

    // ── the console types to itself ──
    const C = clock.current;
    if (motion && t > C.nextKey && parts.keys.length) {
      C.nextKey = t + (chaos ? 0.12 : 0.35) + Math.random() * (chaos ? 0.2 : 0.7);
      parts.press[Math.floor(Math.random() * parts.press.length)].v -= 1.6;
    }
    parts.press.forEach((p, i) => {
      p.v = (p.v + -p.z * 260 * dt) * Math.exp(-16 * dt);
      p.z = Math.max(-0.06, p.z + p.v * dt);
      parts.keys[i].position.z = parts.keysZ[i] + p.z;
    });
    if (parts.knob && motion) parts.knob.rotation.z = Math.sin(t * 0.5) * 1.2;

    // ── loose keycaps in orbit ──
    parts.caps.forEach((c, i) => {
      const k = CAPS[i];
      const a = k.phase + (motion ? t * k.speed * (chaos ? 3 : 1) : 0);
      c.position.set(Math.cos(a) * k.r, k.y + (motion ? Math.sin(t * 0.9 + k.phase) * 0.12 : 0), Math.sin(a) * k.r);
      c.rotation.set(a * k.spin, a * 0.6, motion ? t * k.spin * 0.5 : k.phase);
    });

    // ── the screen has opinions ──
    if (motion && t > C.wink + 4.5) C.wink = t;
    face.draw(
      chaos ? (Math.sin(t * 7) > 0.6 ? "glitch" : "sad") : Math.abs(o.vy) > 2.2 ? "dizzy" : motion && t - C.wink < 0.18 ? "wink" : "calm",
    );
  });

  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 5, 4]} intensity={2.4} />
      {/* a pool of light on a dark floor: the characters fade out toward the edges of the room */}
      <spotLight position={[0, 6, 1.2]} angle={0.42} penumbra={1} intensity={140} decay={1.6} />
      <primitive object={parts.root} />
      {parts.caps.map((c, i) => (
        <primitive key={i} object={c} />
      ))}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.9}>
        <planeGeometry args={[18, 18]} />
        <meshStandardMaterial color="#141311" roughness={0.95} />
      </mesh>
    </>
  );
}

useGLTF.preload(CONSOLE, false, false);
useGLTF.preload(KEYCAP, false, false);
