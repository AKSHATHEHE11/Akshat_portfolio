// Writes public/resume.pdf — a valid one-page placeholder PDF, assembled by hand (no dependencies).
//   node scripts/make-resume.mjs      (Node 24+: reads the TypeScript data files directly)
// When the real résumé exists, drop it in as public/resume.pdf and delete this script.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { profile } from "../data/profile.ts";
import { site } from "../data/site.ts";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/resume.pdf");
const TITLE = `${profile.name} — Résumé (placeholder)`;
const FILE = profile.resume.split("/").pop() ?? "resume.pdf";

// Page text uses the standard 14 fonts in WinAnsiEncoding: escape PDF string delimiters and map the
// few non-ASCII glyphs to their WinAnsi octal codes, so the whole file stays 7-bit ASCII.
const WIN = { "—": "\\227", "é": "\\351", "·": "\\267" };
const str = (s) => `(${s.replace(/[\\()]/g, "\\$&").replace(/[—é·]/g, (c) => WIN[c])})`;
// Document-info strings: UTF-16BE with a byte-order mark, written as hex.
const utf16 = (s) =>
  `<FEFF${Array.from({ length: s.length }, (_, i) => s.charCodeAt(i).toString(16).padStart(4, "0")).join("").toUpperCase()}>`;

// A4 in points
const W = 595.28;
const H = 841.89;
const M = 64;
const top = H - M;

const ops = [];
const text = (font, size, x, y, s) => ops.push(`BT /${font} ${size} Tf ${x} ${y.toFixed(2)} Td ${str(s)} Tj ET`);
const rule = (y, width) => ops.push(`${width} w ${M} ${y.toFixed(2)} m ${(W - M).toFixed(2)} ${y.toFixed(2)} l S`);

ops.push(`1 0.353 0.122 rg ${M} ${(top - 12).toFixed(2)} 12 12 re f`); // the signal square (#FF5A1F)
ops.push("0.067 0.067 0.067 rg 0.067 0.067 0.067 RG"); // ink (#111) for everything else
text("F3", 8, M + 22, top - 9.5, `${site.version}  ·  ${FILE}  ·  placeholder`.toUpperCase());
text("F2", 30, M, top - 76, profile.name);
text("F1", 30, M, top - 112, "Résumé (placeholder)");
rule(top - 136, 1.4);
[
  "The real one is coming.",
  "This placeholder keeps the download link honest until it lands.",
  "Until then, the portfolio is the résumé: every project opens into its own world.",
].forEach((line, i) => text("F1", 12, M, top - 174 - i * 18, line));
text("F3", 9, M, top - 254, profile.roles.join(" / ").toUpperCase());
text("F3", 9, M, top - 270, `${profile.location.city}  ·  ${profile.email}`.toUpperCase());
rule(M + 30, 0.6);
text("F3", 7.5, M, M + 14, `${site.version}  ·  same link, real file soon`.toUpperCase());

const stream = ops.join("\n");
const font = (name) => `<< /Type /Font /Subtype /Type1 /BaseFont /${name} /Encoding /WinAnsiEncoding >>`;
const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents 7 0 R >>`,
  font("Helvetica"),
  font("Helvetica-Bold"),
  font("Courier"),
  `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  `<< /Title ${utf16(TITLE)} /Author ${utf16(profile.name)} /Subject ${utf16("Placeholder — the real résumé is coming")} /Creator (scripts/make-resume.mjs) /Producer (AKSHAT/OS) /CreationDate (D:20261109000000Z) >>`,
];

let pdf = "%PDF-1.4\n";
const offsets = objects.map((body, i) => {
  const at = pdf.length;
  pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  return at;
});
const xref = pdf.length;
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${objects.length} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

// self-check: 7-bit only (so string length == byte length) and every xref entry lands on its object
if (/[^\x00-\x7f]/.test(pdf)) throw new Error("non-ASCII byte in PDF output");
offsets.forEach((o, i) => {
  if (!pdf.startsWith(`${i + 1} 0 obj`, o)) throw new Error(`xref entry ${i + 1} is off`);
});
if (!pdf.startsWith("xref", xref)) throw new Error("startxref is off");

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, pdf, "latin1");
console.log(`wrote ${OUT} (${pdf.length} bytes)`);
