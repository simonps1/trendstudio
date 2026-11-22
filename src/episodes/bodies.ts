import type { Body } from "../series/types";

/** Shared cast. Radii in Earth radii (NASA planetary fact sheets, equatorial). */
export const SUN_R = 109.2;
export const moon: Body = { name: "The Moon", kind: "planet", radius: 0.273, color: "#a9a9ae", surface: "rocky", note: "3,475 km wide" };
export const mercury: Body = { name: "Mercury", kind: "planet", radius: 0.383, color: "#9c948c", surface: "rocky", note: "4,879 km wide" };
export const mars: Body = { name: "Mars", kind: "planet", radius: 0.532, color: "#c1583a", surface: "mars", note: "6,779 km wide" };
export const venus: Body = { name: "Venus", kind: "planet", radius: 0.949, color: "#e2c58a", surface: "plain", note: "12,104 km wide" };
export const earth: Body = { name: "Earth", kind: "planet", radius: 1, color: "#2a6fd6", surface: "earth", note: "12,742 km wide" };
export const neptune: Body = { name: "Neptune", kind: "planet", radius: 3.88, color: "#3f66e0", surface: "plain", note: "3.9 Earths wide" };
export const uranus: Body = { name: "Uranus", kind: "planet", radius: 4.01, color: "#9ad9e0", surface: "plain", note: "4 Earths wide" };
export const saturn: Body = { name: "Saturn", kind: "planet", radius: 9.45, color: "#e0c58e", surface: "bands", rings: true, note: "9 Earths wide" };
export const jupiter: Body = { name: "Jupiter", kind: "planet", radius: 11.2, color: "#d9a877", surface: "bands", note: "11 Earths wide" };
export const sun: Body = { name: "The Sun", kind: "star", radius: SUN_R, temp: 0.55, note: "109 Earths wide" };
