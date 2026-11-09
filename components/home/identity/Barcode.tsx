// A real Code 39 barcode (it scans). 9 elements per glyph, bar-first; 1 = wide.
const CODE39: Record<string, string> = {
  "0": "000110100", "1": "100100001", "2": "001100001", "3": "101100000", "4": "000110001",
  "5": "100110000", "6": "001110000", "7": "000100101", "8": "100100100", "9": "001100100",
  A: "100001001", B: "001001001", C: "101001000", D: "000011001", E: "100011000", F: "001011000",
  G: "000001101", H: "100001100", I: "001001100", J: "000011100", K: "100000011", L: "001000011",
  M: "101000010", N: "000010011", O: "100010010", P: "001010010", Q: "000000111", R: "100000110",
  S: "001000110", T: "000010110", U: "110000001", V: "011000001", W: "111000000", X: "010010001",
  Y: "110010000", Z: "011010000", "-": "010000101", ".": "110000100", " ": "011000100", "*": "010010100",
};

/** Bar/space widths (narrow 1, wide 3), alternating bar-first, wrapped in * start/stop guards. */
export function code39(value: string) {
  const glyphs = `*${value.toUpperCase().replace(/[^0-9A-Z. -]/g, "")}*`;
  const widths: number[] = [];
  [...glyphs].forEach((g, i) => {
    if (i > 0) widths.push(1); // narrow inter-character gap
    for (const bit of CODE39[g]) widths.push(bit === "1" ? 3 : 1);
  });
  return widths;
}

const QUIET = 10;

export function Barcode({ value, vertical = false, className }: { value: string; vertical?: boolean; className?: string }) {
  const bars: { at: number; w: number }[] = [];
  let at = QUIET;
  code39(value).forEach((w, i) => {
    if (i % 2 === 0) bars.push({ at, w });
    at += w;
  });
  const len = at + QUIET;
  return (
    <svg
      viewBox={vertical ? `0 0 40 ${len}` : `0 0 ${len} 40`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Barcode, ${value}`}
      className={className}
    >
      <g fill="currentColor">
        {bars.map((b) =>
          vertical ? <rect key={b.at} x="0" y={b.at} width="40" height={b.w} /> : <rect key={b.at} x={b.at} y="0" width={b.w} height="40" />,
        )}
      </g>
    </svg>
  );
}
