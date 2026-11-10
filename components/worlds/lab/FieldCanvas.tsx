"use client";
// The one WebGL canvas of this world. Loaded with next/dynamic from FieldHost — never import directly.
// Every drawn frame shades the field once per CELL into a small render target, mixed with its own last
// frame (feedback). Then, by host:
// "stage": that target to the screen with crush, grain and chaos tears. REC reads the canvas right after.
// "flow":  the field at the flow screens' cell size, plus its raw stages (noise, warp) in a second small
//          target; each screen reads its stage back in its own scissor box (boxes measured relative to
//          this canvas on resize — never per frame).
// GPU time per frame on the laptop it was tuned on (Intel UHD, 1.25×, 144 Hz), timer queries: stage
// ≈2.2 ms at the default patch, ≈4.8 ms at PIXEL 2 + DETAIL 7; all seven flow screens ≈0.15 ms.
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { pointer } from "@/lib/pointer";
import { seeded } from "@/lib/utils";
import type { Field } from "./field";
import { DISPLAY_FRAG, FIELD_FRAG, FLOW_FRAG, NOISE_SIZE, VERT } from "./shaders";

export type HostKind = "stage" | "flow";
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FieldCanvasProps {
  field: Field;
  mode: HostKind;
  running: boolean;
  reduced: boolean;
  coarse: boolean;
  chaos: boolean;
  /** flow screens by stage index, CSS px relative to the canvas */
  slots: RefObject<(Box | null)[]>;
  /** the control surface is on screen: keep its modulation markers in sync */
  panel: RefObject<boolean>;
  /** world accent as 0..1 display-space rgb (grid lines in the uniforms screen) */
  led: [number, number, number];
  onReady: () => void;
}

const still = { depthTest: false, depthWrite: false } as const;
/** The flow screens always show 3px cells, whatever PIXEL is set to. */
const FLOW_CELL = 3;
// ponytail: a flat ceiling — on a 120/144 Hz panel the field draws on every other refresh, which halves
// its GPU time; a frame-time-adaptive PIXEL is the upgrade if a slower GPU still struggles.
const MIN_FRAME = 1 / 100;

function Pipeline({ field, mode, reduced, coarse, chaos, slots, panel, led }: Omit<FieldCanvasProps, "running" | "onReady">) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);

  const res = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(2, 2);
    const quad = new THREE.Mesh(geometry);
    quad.frustumCulled = false;
    const scene = new THREE.Scene();
    scene.add(quad);
    const camera = new THREE.Camera();
    // the value-noise lattice: random bytes the sampler interpolates (see vnoise in shaders.ts)
    const noise = new THREE.DataTexture(
      Uint8Array.from({ length: NOISE_SIZE * NOISE_SIZE }, (_, i) => seeded(i) * 256),
      NOISE_SIZE,
      NOISE_SIZE,
      THREE.RedFormat,
    );
    noise.wrapS = noise.wrapT = THREE.RepeatWrapping;
    noise.minFilter = noise.magFilter = THREE.LinearFilter;
    noise.needsUpdate = true;
    const shared = {
      uTime: { value: 0 },
      uWarp: { value: 1 },
      uScale: { value: 2 },
      uDetail: { value: 5 },
      uHue: { value: 0 },
      uSpread: { value: 1 },
      uMirror: { value: 0 },
      uPolar: { value: 0 },
      uPa: { value: new THREE.Vector3() },
      uPb: { value: new THREE.Vector3() },
      uPc: { value: new THREE.Vector3() },
      uPd: { value: new THREE.Vector3() },
      uStir: { value: new THREE.Vector4(0, 0, 0, 0.22) },
      uNoise: { value: noise },
    };
    const fieldMat = new THREE.ShaderMaterial({
      ...still,
      vertexShader: VERT,
      fragmentShader: FIELD_FRAG,
      uniforms: { ...shared, uPrev: { value: null }, uRes: { value: new THREE.Vector2(2, 2) }, uFeed: { value: 0 }, uSpin: { value: 0 }, uRaw: { value: 0 } },
    });
    const displayMat = new THREE.ShaderMaterial({
      ...still,
      vertexShader: VERT,
      fragmentShader: DISPLAY_FRAG,
      uniforms: {
        uTex: { value: null },
        uLow: { value: new THREE.Vector2(2, 2) },
        uCrush: { value: 0 },
        uGrain: { value: 0 },
        uTear: { value: 0 },
        uFlash: { value: 0 },
        uSeed: { value: 0 },
        uTearSeed: { value: 0 },
      },
    });
    const flowMat = new THREE.ShaderMaterial({
      ...still,
      vertexShader: VERT,
      fragmentShader: FLOW_FRAG,
      uniforms: {
        ...shared,
        uStages: { value: null },
        uField: { value: null },
        uCells: { value: new THREE.Vector2(2, 2) },
        uStage: { value: 0 },
        uCrush: { value: 0 },
        uGrain: { value: 0 },
        uSeed: { value: 0 },
        uLed: { value: new THREE.Vector3() },
      },
    });
    // half-float keeps long trails from banding; plain bytes where the GPU can't render to it
    const half = gl.extensions.has("EXT_color_buffer_float") || gl.extensions.has("EXT_color_buffer_half_float");
    const opts = {
      type: half ? THREE.HalfFloatType : THREE.UnsignedByteType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    };
    // all at cell resolution: the feedback pair, and the flow screens' raw stages
    const targets = [new THREE.WebGLRenderTarget(2, 2, opts), new THREE.WebGLRenderTarget(2, 2, opts)];
    const stages = new THREE.WebGLRenderTarget(2, 2, opts);
    return { geometry, quad, scene, camera, noise, shared, fieldMat, displayMat, flowMat, targets, stages };
  }, [gl]);

  useEffect(() => {
    (res.flowMat.uniforms.uLed.value as THREE.Vector3).set(...led);
  }, [res, led]);

  // compile all three programs up front — in parallel where the GPU allows (KHR_parallel_shader_compile)
  // — so the flow screens' program doesn't stall the frame that first scrolls them into view
  useEffect(() => {
    const warm = new THREE.Scene();
    for (const m of [res.fieldMat, res.displayMat, res.flowMat]) {
      const q = new THREE.Mesh(res.geometry, m);
      q.frustumCulled = false;
      warm.add(q);
    }
    gl.compileAsync(warm, res.camera).catch(() => {});
  }, [gl, res]);

  useEffect(
    () => () => {
      res.geometry.dispose();
      res.noise.dispose();
      res.fieldMat.dispose();
      res.displayMat.dispose();
      res.flowMat.dispose();
      [...res.targets, res.stages].forEach((t) => t.dispose());
    },
    [res],
  );

  // the store repaints us on demand (reduced motion runs a demand frameloop); REC needs a frame too
  useEffect(() => {
    field.live.invalidate = () => invalidate();
    field.live.canDraw = true;
    return () => {
      field.live.invalidate = () => {};
      field.live.canDraw = false;
    };
  }, [field, invalidate]);
  useEffect(() => invalidate(), [invalidate, mode, chaos, reduced]);

  const st = useRef({ t: 7.3, w: 0, h: 0, cur: 0, wait: 0, frames: 0, fpsAt: 0, stir: 0, sx: 0, sy: 0, tear: 0, tearUntil: 0, nextTear: 0, tearSeed: 0 });

  useFrame((state, delta) => {
    const s = st.current;
    // a demand frame (reduced motion: something changed) always draws
    s.wait += delta;
    if (!reduced && s.wait < MIN_FRAME) return;
    const box = mode === "flow" ? slots.current?.find((b) => b && b.w >= 4 && b.h >= 4) : null;
    if (mode === "flow" && !box) return; // screens not measured yet
    const dt = Math.min(s.wait, 1 / 20);
    s.wait = 0;
    const now = state.clock.elapsedTime;
    const kicked = field.live.kick > 0; // read before tick() spends it on the drift
    const eff = field.tick(dt, chaos, reduced, mode === "stage" && !!panel.current);
    if (!reduced) s.t += dt * eff.flow;

    const u = res.shared;
    u.uTime.value = s.t;
    u.uWarp.value = eff.warp;
    u.uScale.value = eff.scale;
    u.uDetail.value = eff.detail;
    u.uHue.value = eff.hue;
    u.uSpread.value = eff.spread;
    u.uMirror.value = eff.mirror ? 1 : 0;
    u.uPolar.value = eff.polar ? 1 : 0;
    const P = eff.palette;
    u.uPa.value.set(P[0], P[1], P[2]);
    u.uPb.value.set(P[3], P[4], P[5]);
    u.uPc.value.set(P[6], P[7], P[8]);
    u.uPd.value.set(P[9], P[10], P[11]);

    const { width, height, left, top } = state.size;

    // the cell grid: PIXEL-sized cells over the viewport, or 3px cells over one flow screen (they all
    // show the same window of the field, so one grid serves all seven)
    let w: number;
    let h: number;
    if (box) {
      w = Math.max(2, Math.round(box.w / FLOW_CELL));
      h = Math.max(2, Math.round(box.h / FLOW_CELL));
      u.uStir.value.z = 0;
    } else {
      const px = Math.max(2, Math.round(eff.pixel));
      w = Math.max(2, Math.ceil(width / px));
      h = Math.max(2, Math.ceil(height / px));

      // pointer stir: hover on a mouse, a fading ripple where a finger tapped
      const live = field.live.stir;
      let want = 0;
      if (!reduced && !coarse && live.on && pointer.inside) {
        want = Math.min(1, 0.4 + pointer.speed / 28);
        s.sx = pointer.x;
        s.sy = pointer.y;
      } else if (!reduced && coarse && live.at) {
        const age = (performance.now() - live.at) / 1000;
        want = age < 1.6 ? 1 - age / 1.6 : 0;
        s.sx = live.x;
        s.sy = live.y;
      }
      s.stir += (want - s.stir) * (reduced ? 1 : 1 - Math.exp(-dt * 5));
      const ux = (s.sx - left) / Math.max(1, width);
      const uy = 1 - (s.sy - top) / Math.max(1, height);
      u.uStir.value.set((ux - 0.5) * (width / Math.max(1, height)), uy - 0.5, s.stir * 0.85, 0.24);
    }
    if (w !== s.w || h !== s.h) {
      s.w = w;
      s.h = h;
      gl.setClearColor(0x060607, 1);
      for (const t of [...res.targets, res.stages]) {
        t.setSize(w, h);
        gl.setRenderTarget(t);
        gl.clear(true, false, false);
      }
    }

    // the field, once per cell, over its own last frame
    const prev = res.targets[s.cur];
    const next = res.targets[1 - s.cur];
    s.cur = 1 - s.cur;
    const f = res.fieldMat.uniforms;
    f.uPrev.value = prev.texture;
    (f.uRes.value as THREE.Vector2).set(w, h);
    // FEED is tuned at 60 fps: the same trail length at any frame rate
    f.uFeed.value = reduced ? 0 : Math.pow(eff.feed, dt * 60);
    f.uSpin.value = 0.0022 * eff.flow * dt * 60;
    f.uRaw.value = 0;
    res.quad.material = res.fieldMat;
    gl.setRenderTarget(next);
    gl.render(res.scene, res.camera);

    if (mode === "stage") {
      // chaos: the picture tears in short bursts; a chaos burst tears it hard
      if (chaos && !reduced && now > s.nextTear) {
        s.tearUntil = now + 0.08 + Math.random() * 0.28;
        s.nextTear = now + 0.45 + Math.random() * 1.7;
      }
      if (kicked && !reduced) s.tearUntil = Math.max(s.tearUntil, now + 0.45);
      s.tear = now < s.tearUntil ? 0.55 + Math.random() * 0.45 : 0;
      if (now - s.tearSeed > 0.07) s.tearSeed = now;

      gl.setRenderTarget(null);
      const d = res.displayMat.uniforms;
      d.uTex.value = next.texture;
      (d.uLow.value as THREE.Vector2).set(w, h);
      d.uCrush.value = eff.crush;
      d.uGrain.value = eff.grain;
      d.uTear.value = s.tear;
      d.uTearSeed.value = s.tearSeed;
      d.uSeed.value = reduced ? 0.5 : Math.random();
      d.uFlash.value = reduced ? 0 : field.live.flash;
      res.quad.material = res.displayMat;
      gl.render(res.scene, res.camera);

      // REC: the frame is still in the drawing buffer right now
      const snap = field.live.snapshot;
      if (snap) {
        field.live.snapshot = null;
        gl.domElement.toBlob((blob) => snap(blob), "image/png");
        field.live.flash = 1;
      } else field.live.flash = Math.max(0, field.live.flash - dt * 3.2);
    } else {
      // the raw stages for the noise / warp / palette screens, on the same cells
      f.uRaw.value = 1;
      gl.setRenderTarget(res.stages);
      gl.render(res.scene, res.camera);

      gl.setRenderTarget(null);
      gl.setClearColor(0x000000, 0);
      gl.clear(true, false, false);
      const p = res.flowMat.uniforms;
      p.uStages.value = res.stages.texture;
      p.uField.value = next.texture;
      (p.uCells.value as THREE.Vector2).set(w, h);
      p.uCrush.value = eff.crush;
      p.uGrain.value = eff.grain;
      p.uSeed.value = reduced ? 0.5 : Math.random();
      res.quad.material = res.flowMat;
      gl.setScissorTest(true);
      slots.current?.forEach((b, i) => {
        if (!b || b.w < 4 || b.h < 4) return;
        const y = height - b.y - b.h;
        gl.setViewport(b.x, y, b.w, b.h);
        gl.setScissor(b.x, y, b.w, b.h);
        p.uStage.value = i;
        gl.render(res.scene, res.camera);
      });
      gl.setScissorTest(false);
      gl.setViewport(0, 0, width, height);
    }
    field.live.kick = 0;

    s.frames++;
    if (now - s.fpsAt >= 0.5) {
      field.writeStats(Math.round(s.frames / (now - s.fpsAt)), s.w, s.h);
      s.frames = 0;
      s.fpsAt = now;
    }
  }, 1);

  return null;
}

export default function FieldCanvas({ running, onReady, ...rest }: FieldCanvasProps) {
  const loop = !running ? "never" : rest.reduced ? "demand" : "always";
  return (
    <Canvas
      frameloop={loop}
      // fat pixels: every pass that runs per screen pixel only reads cells back, so CSS-pixel resolution
      // is all it needs; .nf-holder scales it to the screen with image-rendering: pixelated (crisp cells,
      // a third fewer pixels to fill at 1.25×, three quarters fewer on a 2× screen)
      dpr={1}
      flat
      linear
      gl={{ antialias: false, alpha: true, depth: false, stencil: false, powerPreference: "high-performance" }}
      onCreated={(state) => {
        // every pass covers its whole target (the flow pass clears once itself): no clear before each draw
        state.gl.autoClear = false;
        requestAnimationFrame(onReady);
      }}
      style={{ pointerEvents: "none" }}
      aria-hidden
    >
      <Pipeline {...rest} />
    </Canvas>
  );
}
