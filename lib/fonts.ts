import { Archivo, IBM_Plex_Mono, Instrument_Serif, VT323 } from "next/font/google";

// Display + UI voice. Variable width (62–125) and weight (100–900) axes — the width axis is what
// lets headlines stretch/squash in kinetic moments without swapping fonts.
export const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  style: ["normal", "italic"],
  variable: "--font-archivo",
  display: "swap",
});

// Editorial accent. Used selectively: names, single words, pull quotes. Never body copy.
export const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

// Technical voice: system messages, coordinates, metadata, indexes.
export const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
  display: "swap",
});

// CRT phosphor face — only inside device screens and the boot sequence.
export const vt323 = VT323({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-vt323",
  display: "swap",
  preload: false,
});

export const fontVariables = [archivo.variable, instrument.variable, plex.variable, vt323.variable].join(" ");
