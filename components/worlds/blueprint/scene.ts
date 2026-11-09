// Scene content for the "blueprint" world. The world agent replaces this with the real shape
// (stations, agents, products, …) and fills it in data/projects/<slug>.ts.
export type BlueprintScene = Record<string, never>;
