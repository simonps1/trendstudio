import { NARRATOR, type Body, type EpisodeSpec } from "../../series/types";

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
  voice: NARRATOR,
  ask: "Which star surprised you most?",
  emphasis: ["planet", "jupiter", "sun", "sirius", "rigel", "betelgeuse", "stephenson", "saturn", "hours", "billions", "disappear"],
  beats: [
    { id: "hook", say: "That tiny dot is our Sun. This is the biggest star we know.", visual: { type: "compare", from: sun, to: s218, big: true, open: true } },
    { id: "earth", say: "To feel how big that is, start with Earth.", visual: { type: "body", body: earth } },
    { id: "jupiter", say: "This is Jupiter, eleven times wider than Earth.", visual: { type: "compare", from: earth, to: jupiter } },
    { id: "sun", say: "And this is the Sun, a hundred and nine Earths across.", visual: { type: "compare", from: jupiter, to: sun } },
    { id: "sunmass", only: "long", say: "It holds ninety-nine percent of all the mass in our solar system.", visual: { type: "body", body: sun, fact: "99.8% of the solar system's mass" } },
    { id: "sirius", only: "long", say: "Sirius, the brightest star in our night sky, is almost twice as wide.", visual: { type: "compare", from: sun, to: sirius } },
    { id: "rigel", only: "long", say: "Rigel, a blue supergiant, is nearly eighty Suns across.", visual: { type: "compare", from: sirius, to: rigel } },
    { id: "betel-s", only: "short", say: "Betelgeuse is about seven hundred times wider than that.", visual: { type: "compare", from: sun, to: betelgeuse } },
    { id: "betel-l", only: "long", say: "Betelgeuse, a red supergiant, is about seven hundred Suns across.", visual: { type: "compare", from: rigel, to: betelgeuse } },
    { id: "betelmars", only: "long", say: "If it replaced our Sun, its surface would reach out past Mars.", visual: { type: "body", body: betelgeuse, fact: "would reach past Mars" } },
    { id: "s218", say: "And then there is Stephenson two eighteen, around two thousand Suns across.", visual: { type: "compare", from: betelgeuse, to: s218, big: true } },
    { id: "volume", only: "long", say: "You could fit nearly ten billion Suns inside it.", visual: { type: "body", body: s218, fact: "≈ 10 billion Suns by volume" } },
    {
      id: "orbits", say: "Put it in our solar system, and it would swallow everything out to Saturn.",
      visual: { type: "orbits", body: s218, radiusAu: 10, orbits: [
        { name: "Earth", au: 1 }, { name: "Mars", au: 1.52, label: false }, { name: "Jupiter", au: 5.2 }, { name: "Saturn", au: 9.58 },
      ] },
    },
    { id: "bright", only: "long", say: "It's cooler than the Sun, yet hundreds of thousands of times brighter.", visual: { type: "body", body: s218, fact: "100,000s of times brighter" } },
    { id: "lap1", only: "long", say: "Light can circle the Earth seven times in a single second.", visual: { type: "body", body: earth, fact: "7.5 laps of Earth per second" } },
    { id: "lap2", say: "Even light needs almost nine hours to travel around this star.", visual: { type: "lap", body: s218, value: 8.7, unit: "hours" } },
    { id: "far", only: "long", say: "It's so far away that its light takes nearly twenty thousand years to reach us.", visual: { type: "body", body: s218, fact: "≈ 19,000 light-years away" } },
    { id: "unstable", only: "long", say: "Stars this big don't last. One day it will collapse, and explode.", visual: { type: "body", body: s218, fact: "destined to explode" } },
    { id: "end", say: "And it's still just one star, out of billions.", visual: { type: "shrink", body: s218 } },
    { id: "cta", only: "long", say: "Follow for more cosmic scale.", visual: { type: "stars" } },
  ],
};
