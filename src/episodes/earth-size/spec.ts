import { NARRATOR, type Body, type EpisodeSpec } from "../../series/types";
import { mars, moon } from "../bodies";

// Radii in Earth radii (NASA planetary fact sheets). Stephenson 2-18 is a published estimate.
const SUN = 109.2;
const earth: Body = { name: "Earth", kind: "planet", radius: 1, color: "#2a6fd6", surface: "earth", note: "12,742 km wide" };
const neptune: Body = { name: "Neptune", kind: "planet", radius: 3.88, color: "#3f66e0", surface: "plain", note: "almost 4 Earths wide" };
const jupiter: Body = { name: "Jupiter", kind: "planet", radius: 11.2, color: "#d9a877", surface: "bands", note: "11 Earths wide" };
const sun: Body = { name: "The Sun", kind: "star", radius: SUN, temp: 0.55, note: "109 Earths wide" };
const s218: Body = { name: "Stephenson 2-18", kind: "star", radius: 2150 * SUN, temp: 0, note: "≈ 2,150 Suns wide · estimate" };

export const EARTH_SIZE: EpisodeSpec = {
  id: "earth-size",
  series: "Cosmic Scale",
  episode: 2,
  title: "How small is Earth, really?",
  voice: NARRATOR,
  ask: "Did you know Earth was this small?",
  emphasis: ["earth", "moon", "mars", "neptune", "jupiter", "sun", "thousand", "million", "fourteen", "billions", "disappears", "storm"],
  beats: [
    { id: "hook", only: "short", say: "That tiny dot is Earth. This is the Sun, drawn to the same scale.", visual: { type: "compare", from: earth, to: sun, big: true, open: true } },
    { id: "hook-l", only: "long", say: "Our whole world is that tiny dot. Next to it is the Sun, drawn to the same scale.", visual: { type: "compare", from: earth, to: sun, big: true, open: true } },
    { id: "moon", only: "long", say: "To see how small our world really is, start with the Moon.", visual: { type: "body", body: moon } },
    { id: "moongap", only: "long", say: "It's so far away that every other planet could fit in the gap between us.", visual: { type: "body", body: moon, fact: "all the planets fit in the gap" } },
    { id: "moon-earth", only: "short", say: "Earth is almost four times wider than the Moon.", visual: { type: "compare", from: moon, to: earth } },
    { id: "mars", only: "long", say: "Mars is about twice as wide as the Moon.", visual: { type: "compare", from: moon, to: mars } },
    { id: "mars-earth", only: "long", say: "And Earth is about twice as wide as Mars.", visual: { type: "compare", from: mars, to: earth } },
    { id: "people", only: "long", say: "Every person who has ever lived was born on this one planet.", visual: { type: "body", body: earth, fact: "home to 8 billion people" } },
    { id: "ocean", only: "long", say: "Seen from space, most of its surface is covered by ocean.", visual: { type: "body", body: earth, fact: "71% covered by ocean" } },
    { id: "neptune", only: "long", say: "Neptune is almost four times wider than Earth.", visual: { type: "compare", from: earth, to: neptune } },
    { id: "winds", only: "long", say: "Its winds are the fastest in the solar system.", visual: { type: "body", body: neptune, fact: "winds over 2,000 km/h" } },
    { id: "jupiter-s", only: "short", say: "Jupiter is eleven times wider than Earth.", visual: { type: "compare", from: earth, to: jupiter } },
    { id: "jupiter-l", only: "long", say: "And Jupiter is nearly three times wider than Neptune.", visual: { type: "compare", from: neptune, to: jupiter } },
    { id: "jupvol", say: "More than a thousand Earths would fit inside it.", visual: { type: "body", body: jupiter, fact: "holds 1,300 Earths" } },
    { id: "spot", only: "long", say: "Its Great Red Spot is a single storm that is wider than Earth.", visual: { type: "body", body: jupiter, fact: "one storm, wider than Earth" } },
    { id: "sun", say: "And the Sun is about ten times wider than Jupiter.", visual: { type: "compare", from: jupiter, to: sun, big: true } },
    { id: "sunvol", say: "You could fit more than a million Earths inside the Sun.", visual: { type: "body", body: sun, fact: "holds 1.3 million Earths" } },
    { id: "minutes", only: "long", say: "Its light takes eight minutes to reach us.", visual: { type: "body", body: sun, fact: "8 light-minutes away" } },
    { id: "row", only: "long", say: "You would need over a hundred Suns in a row to bridge that distance.", visual: { type: "body", body: sun, fact: "107 Suns from here to Earth" } },
    { id: "lap", say: "Light circles the Earth in a blink, but needs fourteen seconds to lap the Sun.", visual: { type: "lap", body: sun, value: 14.6, unit: "seconds" } },
    { id: "end-s", only: "short", say: "And our Sun is only one star among hundreds of billions.", visual: { type: "shrink", body: sun } },
    { id: "s218", only: "long", say: "And next to one of the largest stars we know, even the Sun disappears.", visual: { type: "compare", from: sun, to: s218, big: true } },
    { id: "end-l", only: "long", say: "And that is still only one star among hundreds of billions.", visual: { type: "shrink", body: s218 } },
    { id: "cta", only: "long", say: "Follow for more cosmic scale.", visual: { type: "stars" } },
  ],
};
