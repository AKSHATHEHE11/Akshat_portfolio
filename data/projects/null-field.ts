import type { Project } from "@/lib/types";
import type { LabScene } from "@/components/worlds/lab/scene";

// DUMMY project content — realistic shape, replace with real details later.
export const nullField: Project<LabScene> = {
  id: "06",
  slug: "null-field",
  title: "Null Field",
  tagline: "A WebGL sandbox where every slider is a bad idea worth trying.",
  description:
    "Null Field is an experimental WebGL playground: a live shader instrument with knobs, presets and a record button, built to find visuals by accident.",
  category: "Experimental WebGL Playground",
  year: 2026,
  status: "in progress",
  role: ["Creative coding", "Shader art", "Tooling"],
  technologies: [
    { name: "Three.js", group: "motion", why: "Scene graph and render targets." },
    { name: "GLSL", group: "motion", why: "Domain-warped noise, feedback buffers, dithering." },
    { name: "React Three Fiber", group: "frontend", why: "Shaders as components with React state as uniforms." },
    { name: "WebAudio", group: "frontend", why: "Uniforms can follow the microphone or a synth." },
  ],
  color: { bg: "#050505", fg: "#f2eee7", accent: "#d8ff00" },
  environment: "lab",
  metrics: [
    { label: "Presets discovered", value: "64" },
    { label: "Frames per second", value: "120", note: "on a laptop GPU" },
    { label: "Lines of GLSL", value: "1.9k" },
  ],
  challenge: "Shader experiments usually die in a code editor because changing one number means recompiling and squinting.",
  solution: "Turn every uniform into a physical-feeling control, keep the render live, and make saving a happy accident one key press.",
  outcome: "A personal instrument for finding visuals — several of them ended up in client work.",
  process: [
    { title: "Uniforms as knobs", body: "Every number in the shader becomes a control with sensible limits." },
    { title: "Presets as memory", body: "Press R and the current state is stored as a preset with a generated name." },
  ],
  decisions: [
    {
      question: "Code editor or instrument?",
      options: [
        { label: "Live code editor", note: "Powerful, and you spend the evening reading code." },
        { label: "Instrument", note: "Limited controls, fast hands, more accidents." },
      ],
      chosen: 1,
      why: "The point is to be surprised, not to be precise.",
    },
  ],
  links: [
    { label: "Play the field", href: "#preview" },
    { label: "Read the process", href: "#process" },
  ],
  scene: {},
};
