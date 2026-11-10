"use client";
import "./about.css";
import { Bio } from "./bio/Bio";
import { BuildSystem } from "./build/BuildSystem";
import { Close } from "./Close";
import { Journey } from "./journey/Journey";
import { Room } from "./room/Room";

/** /about — an identity you discover: the desk, the bio, the build system, the line so far. */
export default function AboutPage() {
  return (
    <div className="ab-page relative">
      <Room />
      <Bio />
      <BuildSystem />
      <Journey />
      <Close />
    </div>
  );
}
