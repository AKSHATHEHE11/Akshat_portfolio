"use client";
// Single entry point for GSAP. Import gsap and its core plugins from here, never from "gsap" directly,
// so registration happens exactly once and the custom eases exist.
//
// Core (registered here): ScrollTrigger, SplitText, ScrambleTextPlugin, CustomEase, Observer, useGSAP.
// Heavier plugins are registered by the feature that needs them, so they stay out of the shared bundle:
//   import { Flip } from "gsap/Flip";            gsap.registerPlugin(Flip)
//   import { Draggable } from "gsap/Draggable";  import { InertiaPlugin } from "gsap/InertiaPlugin"
//   import { DrawSVGPlugin } / MorphSVGPlugin / MotionPathPlugin / Physics2DPlugin from "gsap/…"
// (All GSAP plugins are free and already installed.)
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { CustomEase } from "gsap/CustomEase";
import { Observer } from "gsap/Observer";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, ScrambleTextPlugin, CustomEase, Observer);
  // House eases (mirror the CSS tokens in app/globals.css)
  CustomEase.create("machine", "0.7,0,0.2,1"); // --ease-machine: deliberate, mechanical
  CustomEase.create("snap", "0.34,1.56,0.64,1"); // --ease-snap: overshoot for keys/toggles
  gsap.defaults({ ease: "expo.out", duration: 0.9 });
  ScrollTrigger.config({ ignoreMobileResize: true });
}

export { gsap, ScrollTrigger, SplitText, ScrambleTextPlugin, CustomEase, Observer, useGSAP };
