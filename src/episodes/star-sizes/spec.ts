import type { Body, EpisodeSpec } from "../../series/types";

// Radii in Earth radii. Star sizes are published best estimates (the largest are uncertain).
const SUN = 109.2;
const earth: Body = { name: "Earth", kind: "planet", radius: 1, color: "#2a6fd6", surface: "earth", note: "12,742 km wide" };
const jupiter: Body = { name: "Jupiter", kind: "planet", radius: 11.2, color: "#d9a877", surface: "bands", note: "11 Earths wide" };
const sun: Body = { name: "The Sun", kind: "star", radius: SUN, temp: 0.55, note: "109 Earths wide" };
const sirius: Body = { name: "Sirius", kind: "star", radius: 1.71 * SUN, temp: 0.95, note: "1.7 Suns wide" };
const rigel: Body = { name: "Rigel", kind: "star", radius: 78 * SUN, temp: 1, note: "≈ 78 Suns wide" };
const betelgeuse: Body = { name: "Betelgeuse", kind: "star", radius: 700 * SUN, temp: 0.08, note: "≈ 700 Suns wide · estimate" };
const s218: Body = { name: "Stephenson 2-18", kind: "star", radius: 2150 * SUN, temp: 0, note: "≈ 2,150 Suns wide · estimate" };

export const STAR_SIZES: EpisodeSpec = {
  id: "star-sizes",
  series: "Cosmic Scale",
  episode: 1,
  title: "How big is the biggest star?",
  voice: "af_heart",
  emphasis: ["planet", "jupiter", "sun", "sirius", "rigel", "betelgeuse", "stephenson", "saturn", "hours", "billions", "disappear"],
  beats: [
    { id: "hook", say: "Everything you've ever known is on this planet. Now watch it disappear.", visual: { type: "body", body: earth }, speed: 1.08 },
    { id: "jupiter", say: "Jupiter. Eleven Earths wide.", visual: { type: "compare", from: earth, to: jupiter } },
    { id: "sun", say: "The Sun. One hundred and nine Earths wide.", visual: { type: "compare", from: jupiter, to: sun } },
    { id: "sunmass", only: "long", say: "It holds ninety-nine percent of the solar system's mass.", visual: { type: "body", body: sun } },
    { id: "sirius", only: "long", say: "Sirius. The brightest star in our sky. Almost twice the Sun.", visual: { type: "compare", from: sun, to: sirius } },
    { id: "rigel", only: "long", say: "Rigel. Nearly eighty Suns wide.", visual: { type: "compare", from: sirius, to: rigel } },
    { id: "betel-s", only: "short", say: "Betelgeuse. About seven hundred Suns.", visual: { type: "compare", from: sun, to: betelgeuse } },
    { id: "betel-l", only: "long", say: "Betelgeuse. About seven hundred Suns.", visual: { type: "compare", from: rigel, to: betelgeuse } },
    { id: "betelmars", only: "long", say: "In the Sun's place, it would reach past Mars.", visual: { type: "body", body: betelgeuse } },
    { id: "s218", say: "And the biggest star we know: Stephenson two eighteen. Two thousand Suns across.", visual: { type: "compare", from: betelgeuse, to: s218, big: true } },
    { id: "volume", only: "long", say: "Ten billion Suns could fit inside it.", visual: { type: "body", body: s218 } },
    {
      id: "orbits", say: "In our solar system, it would swallow Saturn.",
      visual: { type: "orbits", body: s218, radiusAu: 10, orbits: [
        { name: "Earth", au: 1 }, { name: "Mars", au: 1.52, label: false }, { name: "Jupiter", au: 5.2 }, { name: "Saturn", au: 9.58 },
      ] },
    },
    { id: "bright", only: "long", say: "It's cooler than the Sun, yet hundreds of thousands of times brighter.", visual: { type: "body", body: s218 } },
    { id: "lap1", only: "long", say: "Light circles Earth seven times a second.", visual: { type: "body", body: earth } },
    { id: "lap2", say: "Light needs almost nine hours to circle it once.", visual: { type: "lap", body: s218, value: 8.7, unit: "hours" } },
    { id: "far", only: "long", say: "It's so far away, its light takes nearly twenty thousand years to reach us.", visual: { type: "body", body: s218 } },
    { id: "unstable", only: "long", say: "Stars this big don't last. One day it will collapse, and explode.", visual: { type: "body", body: s218 } },
    { id: "end", say: "And it's just one star. Out of billions.", visual: { type: "shrink", body: s218 } },
    { id: "cta", only: "long", say: "Follow for more cosmic scale.", visual: { type: "stars" } },
  ],
};
