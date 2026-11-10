// A real QR code (it scans): byte mode, error correction L, versions 1–4 (one RS block each),
// mask 0. Enough for an ID payload of up to 78 bytes. Follows the layout of Nayuki's reference
// encoder. ponytail: fixed mask and no penalty scoring — every mask is valid, scoring only picks
// the prettiest; add it if a reader ever struggles.

const DATA = [0, 19, 34, 55, 80]; // data codewords per version at level L
const ECC = [0, 7, 10, 15, 20]; // error-correction codewords per version at level L

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = x;
  LOG[x] = i;
  x <<= 1;
  if (x & 0x100) x ^= 0x11d;
}
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
const mul = (a: number, b: number) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

/** Reed–Solomon remainder: `n` error-correction codewords for `data`. */
export function rs(data: number[], n: number) {
  let g = [1];
  for (let i = 0; i < n; i++) {
    const next = new Array<number>(g.length + 1).fill(0);
    g.forEach((c, j) => {
      next[j] ^= c;
      next[j + 1] ^= mul(c, EXP[i]);
    });
    g = next;
  }
  const r = [...data, ...new Array<number>(n).fill(0)];
  data.forEach((_, i) => {
    const c = r[i];
    if (c) for (let j = 1; j < g.length; j++) r[i + j] ^= mul(g[j], c);
  });
  return r.slice(data.length);
}

/** 15 format bits for level L (01) and a mask, BCH-coded and XOR-masked. */
export function format(mask: number) {
  const data = (1 << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

function codewords(bytes: Uint8Array, v: number) {
  const bits: number[] = [];
  const put = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  };
  put(0b0100, 4);
  put(bytes.length, 8);
  bytes.forEach((b) => put(b, 8));
  put(0, Math.min(4, DATA[v] * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const words: number[] = [];
  for (let i = 0; i < bits.length; i += 8) words.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let pad = 0xec; words.length < DATA[v]; pad ^= 0xec ^ 0x11) words.push(pad);
  return words;
}

/** The module matrix, rows of booleans (true = dark). No quiet zone. */
export function qr(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);
  const v = [1, 2, 3, 4].find((n) => bytes.length + 2 <= DATA[n]);
  if (!v) throw new Error(`QR payload too long (${bytes.length} bytes)`);
  const size = 17 + 4 * v;
  const dark = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const fixed = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const set = (r: number, c: number, on: boolean) => {
    dark[r][c] = on;
    fixed[r][c] = true;
  };

  // finders + separators
  for (const [r0, c0] of [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ])
    for (let r = -1; r <= 7; r++)
      for (let c = -1; c <= 7; c++) {
        const rr = r0 + r;
        const cc = c0 + c;
        if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
        const d = Math.max(Math.abs(r - 3), Math.abs(c - 3));
        set(rr, cc, d !== 2 && d !== 4);
      }
  // timing
  for (let i = 8; i < size - 8; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  // the one alignment pattern of versions 2–6
  if (v >= 2)
    for (let r = -2; r <= 2; r++)
      for (let c = -2; c <= 2; c++) set(size - 7 + r, size - 7 + c, Math.max(Math.abs(r), Math.abs(c)) !== 1);

  // format bits (both copies) + the dark module
  const f = format(0);
  const bit = (i: number) => ((f >>> i) & 1) === 1;
  for (let i = 0; i <= 5; i++) set(i, 8, bit(i));
  set(7, 8, bit(6));
  set(8, 8, bit(7));
  set(8, 7, bit(8));
  for (let i = 9; i < 15; i++) set(8, 14 - i, bit(i));
  for (let i = 0; i < 8; i++) set(8, size - 1 - i, bit(i));
  for (let i = 8; i < 15; i++) set(size - 15 + i, 8, bit(i));
  set(size - 8, 8, true);

  // data, zig-zag from the bottom-right, two columns at a time, skipping the timing column
  const words = codewords(bytes, v);
  const stream = [...words, ...rs(words, ECC[v])];
  let k = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    const up = ((right + 1) & 2) === 0;
    for (let j = 0; j < size; j++) {
      const r = up ? size - 1 - j : j;
      for (const c of [right, right - 1]) {
        if (fixed[r][c]) continue;
        const b = k < stream.length * 8 ? ((stream[k >>> 3] >>> (7 - (k & 7))) & 1) === 1 : false;
        k++;
        dark[r][c] = b !== ((r + c) % 2 === 0); // mask 0
      }
    }
  }
  return dark;
}
