// Serialized type-check + lint for the paths you own.
//   node scripts/check.mjs components/hero scripts/models/console.mjs
// - TypeScript runs on the whole project (types are global) but only diagnostics inside the given
//   paths are printed; errors elsewhere are counted and ignored.
// - ESLint runs on the given paths only.
// - A lock directory makes concurrent runs queue up instead of exhausting RAM.
import { existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";

const paths = process.argv.slice(2).map((p) => p.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/$/, ""));
const LOCK = ".locks/check";
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

mkdirSync(".locks", { recursive: true });
let waited = 0;
for (;;) {
  try {
    mkdirSync(LOCK);
    break;
  } catch {
    try {
      if (Date.now() - statSync(LOCK).mtimeMs > 8 * 60_000) rmSync(LOCK, { recursive: true, force: true });
    } catch {}
    if (waited % 20_000 === 0) console.log(`(waiting for another check to finish… ${waited / 1000}s)`);
    sleep(1000);
    waited += 1000;
  }
}
const release = () => rmSync(LOCK, { recursive: true, force: true });
process.on("exit", release);
process.on("SIGINT", () => process.exit(130));

let failed = false;

// 1 — TypeScript
const tsc = spawnSync(process.execPath, ["node_modules/typescript/bin/tsc", "--noEmit", "--incremental", "false", "--pretty", "false"], {
  encoding: "utf8",
  maxBuffer: 1 << 27,
});
const blocks = [];
let cur = null;
for (const line of `${tsc.stdout ?? ""}${tsc.stderr ?? ""}`.split(/\r?\n/)) {
  if (/^\S.*\(\d+,\d+\): error TS\d+/.test(line)) {
    cur = [line];
    blocks.push(cur);
  } else if (cur && /^\s/.test(line)) cur.push(line);
  else cur = null;
}
const norm = (s) => s.replace(/\\/g, "/");
const mine = paths.length ? blocks.filter((b) => paths.some((p) => norm(b[0]).startsWith(p))) : blocks;
if (mine.length) {
  failed = true;
  console.log(`TypeScript: ${mine.length} error(s) in your paths\n${mine.map((b) => b.join("\n")).join("\n")}`);
} else console.log(`TypeScript: OK (${paths.join(", ") || "whole project"})`);
if (blocks.length - mine.length > 0) console.log(`  (${blocks.length - mine.length} error(s) in other people's files — not yours, ignore)`);

// 2 — ESLint
const targets = paths.filter((p) => existsSync(p));
if (targets.length) {
  const es = spawnSync(process.execPath, ["node_modules/eslint/bin/eslint.js", ...targets], { encoding: "utf8", maxBuffer: 1 << 26 });
  const text = `${es.stdout ?? ""}${es.stderr ?? ""}`.trim();
  if (es.status !== 0) {
    failed = true;
    console.log(`ESLint: problems\n${text}`);
  } else console.log(`ESLint: OK${text ? `\n${text}` : ""}`);
}

process.exitCode = failed ? 1 : 0;
