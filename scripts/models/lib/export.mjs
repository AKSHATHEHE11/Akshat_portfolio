// Shared helpers for generating .glb models in Node with three.js.
// Every model script builds a THREE.Scene from code and calls exportGLB(scene, 'name').
// Output lands in public/models/<name>.glb so the site can load it with useGLTF('/models/<name>.glb').
//
// Rules for model scripts:
// - Geometry + materials only. No image textures (Node has no canvas): screens/labels are drawn at
//   runtime in the browser with CanvasTexture on meshes you name here.
// - Name every mesh the site needs to find or animate (mesh.name = 'key_design'), and group moving
//   parts under a named Object3D whose origin is the pivot (e.g. the knob rotates around its own Y).
// - Use metres-ish scale: the whole model should fit in roughly a 2-unit box, centred on the origin.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

// GLTFExporter's binary path uses FileReader, which Node does not ship.
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    result = null;
    onload = null;
    onloadend = null;
    onerror = null;
    #finish(result) {
      this.result = result;
      this.onload?.({ target: this });
      this.onloadend?.({ target: this });
    }
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => this.#finish(buf), (err) => this.onerror?.(err));
    }
    readAsDataURL(blob) {
      blob.arrayBuffer().then(
        (buf) => this.#finish(`data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(buf).toString('base64')}`),
        (err) => this.onerror?.(err),
      );
    }
  };
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

export async function exportGLB(scene, name) {
  const exporter = new GLTFExporter();
  const glb = await exporter.parseAsync(scene, { binary: true, onlyVisible: true });
  const out = resolve(ROOT, 'public/models', `${name}.glb`);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, Buffer.from(glb));
  let meshes = 0;
  scene.traverse((o) => { if (o.isMesh) meshes++; });
  console.log(`✓ ${name}.glb  ${(glb.byteLength / 1024).toFixed(1)} KB  ${meshes} meshes  → public/models/${name}.glb`);
  return out;
}

/** PBR material shorthand. Keeps every model on the same physically-based grammar. */
export function mat(color, { roughness = 0.55, metalness = 0, name, emissive, emissiveIntensity, transparent, opacity, clearcoat } = {}) {
  const Ctor = clearcoat ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
  const m = new Ctor({ color, roughness, metalness });
  if (clearcoat) { m.clearcoat = clearcoat; m.clearcoatRoughness = 0.25; }
  if (emissive) { m.emissive = new THREE.Color(emissive); m.emissiveIntensity = emissiveIntensity ?? 1; }
  if (transparent) { m.transparent = true; m.opacity = opacity ?? 0.5; }
  if (name) m.name = name;
  return m;
}

export { THREE };
