import type { Body, EpisodeSpec } from "../../series/types";

// Radii in Earth radii. Sources: Sirius B 0.0084 R☉ (Bond et al. 2017); EBLM J0555-57Ab 0.84 R♃
// (von Boetticher et al. 2017); Proxima Centauri 0.154 R☉; a typical neutron star is ≈ 10–12 km in radius.
const SUN = 109.2;
const neutron: Body = { name: "Neutron star", kind: "star", radius: 0.0017, temp: 1, note: "≈ 20 km wide" };
const siriusB: Body = { name: "Sirius B", kind: "star", radius: 0.92, temp: 0.92, note: "white dwarf · smaller than Earth" };
const earth: Body = { name: "Earth", kind: "planet", radius: 1, color: "#2a6fd6", surface: "earth", note: "12,742 km wide" };
const smallest: Body = { name: "EBLM J0555-57Ab", kind: "star", radius: 9.4, temp: 0.06, note: "about as wide as Saturn" };
const proxima: Body = { name: "Proxima Centauri", kind: "star", radius: 16.8, temp: 0.03, note: "1.5 Jupiters wide" };
const sun: Body = { name: "The Sun", kind: "star", radius: SUN, temp: 0.55, note: "109 Earths wide" };

export const TINY_STARS: EpisodeSpec = {
  id: "tiny-stars",
  series: "Cosmic Scale",
  episode: 3,
  title: "How small can a star get?",
  voice: "chatterbox",
  emphasis: ["star", "earth", "neutron", "kilometres", "teaspoon", "dwarf", "saturn", "jupiter", "proxima", "giant", "trillions", "smaller", "sun"],
  beats: [
    { id: "hook", say: "This is a real star, and this is how small it is next to Earth.", visual: { type: "compare", from: neutron, to: earth, big: true } },
    { id: "neutron", say: "It's a neutron star, only about twenty kilometres wide.", visual: { type: "body", body: neutron } },
    { id: "mass", say: "Yet it holds more mass than our entire Sun.", visual: { type: "body", body: neutron, fact: "more mass than the Sun" } },
    { id: "teaspoon", only: "long", say: "A single teaspoon of it would weigh billions of tonnes.", visual: { type: "body", body: neutron, fact: "1 teaspoon ≈ billions of tonnes" } },
    { id: "spin", only: "long", say: "Some of them spin hundreds of times every second.", visual: { type: "body", body: neutron, fact: "up to 716 spins per second" } },
    { id: "remnant", only: "long", say: "It's what remains after a giant star explodes.", visual: { type: "body", body: neutron, fact: "left behind by a supernova" } },
    { id: "dwarf", say: "A white dwarf is far bigger, but still smaller than Earth.", visual: { type: "compare", from: neutron, to: siriusB } },
    { id: "core", only: "long", say: "It's the leftover core of a star that has died.", visual: { type: "body", body: siriusB, fact: "the core of a dead star" } },
    { id: "packed", only: "long", say: "It packs the mass of the Sun into the size of a planet.", visual: { type: "body", body: siriusB, fact: "a Sun's mass, planet-sized" } },
    { id: "future", only: "long", say: "One day, our own Sun will end up just like this.", visual: { type: "body", body: siriusB, fact: "the Sun's future" } },
    { id: "smallest", say: "The smallest star still burning is only about as wide as Saturn.", visual: { type: "compare", from: siriusB, to: smallest } },
    { id: "limit", only: "long", say: "Any smaller, and it could not shine at all.", visual: { type: "body", body: smallest, fact: "the lower limit for a star" } },
    { id: "proxima", say: "Proxima Centauri, the nearest star to the Sun, is only a little wider than Jupiter.", visual: { type: "compare", from: smallest, to: proxima } },
    { id: "dim", only: "long", say: "It's so dim that you can't see it without a telescope.", visual: { type: "body", body: proxima, fact: "too dim to see by eye" } },
    { id: "planet", only: "long", say: "It still has at least one planet of its own.", visual: { type: "body", body: proxima, fact: "has its own planets" } },
    { id: "trillions", only: "long", say: "But it will keep burning for trillions of years.", visual: { type: "body", body: proxima, fact: "lifespan: trillions of years" } },
    { id: "sun", say: "Next to all of them, our Sun is a giant.", visual: { type: "compare", from: proxima, to: sun, big: true } },
    { id: "sunlife", only: "long", say: "But it will only shine for about ten billion years.", visual: { type: "body", body: sun, fact: "lifespan: ≈ 10 billion years" } },
    { id: "end", say: "In fact, most of the stars in our galaxy are smaller than the Sun.", visual: { type: "shrink", body: sun } },
    { id: "cta", only: "long", say: "Follow for more cosmic scale.", visual: { type: "stars" } },
  ],
};
