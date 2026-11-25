import { NARRATOR, type Body, type EpisodeSpec } from "../../series/types";

// Radii in Earth radii. Sources: Sirius B 0.0084 R☉ (Bond et al. 2017); EBLM J0555-57Ab 0.84 R♃
// (von Boetticher et al. 2017); Proxima Centauri 0.154 R☉; a typical neutron star is ≈ 10–12 km in radius.
const SUN = 109.2;
const neutron: Body = { name: "Neutron star", kind: "star", radius: 0.0017, temp: 1, note: "≈ 20 km wide" };
const siriusB: Body = { name: "Sirius B", kind: "star", radius: 0.92, temp: 0.92, note: "white dwarf · smaller than Earth" };
const earth: Body = { name: "Earth", kind: "planet", radius: 1, color: "#2a6fd6", surface: "earth", note: "12,742 km wide" };
const smallest: Body = { name: "EBLM J0555-57Ab", kind: "star", radius: 9.4, temp: 0.06, note: "about as wide as Saturn" };
const proxima: Body = { name: "Proxima Centauri", kind: "star", radius: 16.8, temp: 0.03, note: "1.5 Jupiters wide" };
const sun: Body = { name: "The Sun", kind: "star", radius: SUN, temp: 0.55, note: "109 Earths wide" };

// Long cut: the Sun's future. Red-giant peak ≈ 256 R☉ (1.19 AU) and the engulfment of Mercury, Venus and
// probably Earth: Schröder & Smith 2008 (MNRAS 386, 155); the remnant is a ≈ 0.54 M☉ white dwarf, about
// 1.5 Earth radii by the white-dwarf mass–radius relation. Sirius B: 8.6 light-years (Bond et al. 2017).
const redGiant: Body = { name: "The Sun as a red giant", kind: "star", radius: 256 * SUN, temp: 0, note: "≈ 250 Suns wide · estimate" };
const sunDwarf: Body = { name: "The Sun as a white dwarf", kind: "star", radius: 1.47, temp: 0.95, note: "about the size of Earth" };
export const TINY_STARS: EpisodeSpec = {
  id: "tiny-stars",
  series: "Cosmic Scale",
  episode: 5,
  episodeLong: 7,
  title: "How small can a star get?",
  titleLong: "What the Sun will shrink into",
  voice: NARRATOR,
  ask: "Neutron star or white dwarf?",
  askLong: "Would you want to see the Sun as a red giant?",
  emphasis: ["shrink", "red", "hydrogen", "white", "mercury", "venus", "tonnes", "sirius", "black", "core", "brighter", "star", "earth", "neutron", "kilometres", "teaspoon", "dwarf", "saturn", "jupiter", "proxima", "giant", "trillions", "smaller", "sun"],
  beats: [
    // cold open on a real photograph: New York at night from the Space Station, with a neutron star drawn on it to
    // scale (Central Park, 4 km long, sets the scale; see public/photos/CREDITS.md). Manhattan is 21.6 km long.
    { id: "hook", only: "short", say: "A real star could fit inside New York City.", visual: { type: "photo", image: "photos/new-york-night.jpg", body: neutron, at: [0.548, 0.62], r: 0.385, ring: "≈ 20 km wide, to scale", lift: 0.06 } },
    { id: "neutron", only: "short", say: "It's a neutron star, only about twenty kilometres wide, the length of Manhattan.", visual: { type: "body", body: neutron } },
    { id: "mass", only: "short", say: "Yet it holds more mass than our entire Sun.", visual: { type: "body", body: neutron, fact: "more mass than the Sun" } },
    { id: "dwarf", only: "short", say: "Sirius B, a white dwarf, is far bigger, but still smaller than Earth.", visual: { type: "compare", from: neutron, to: siriusB } },
    { id: "smallest", only: "short", say: "The smallest star we know of is only about as wide as Saturn.", visual: { type: "compare", from: siriusB, to: smallest } },
    { id: "proxima", only: "short", say: "Proxima Centauri, the nearest star to the Sun, is only one and a half times as wide as Jupiter.", visual: { type: "compare", from: smallest, to: proxima } },
    { id: "sun", only: "short", say: "Next to all of them, our Sun is a giant.", visual: { type: "compare", from: proxima, to: sun, big: true } },
    { id: "end", only: "short", say: "In fact, most of the stars in our galaxy are smaller than the Sun.", visual: { type: "shrink", body: sun } },
    // ---- long cut: its own story, sharing no lines or pictures with the short

    { id: "hook-l", only: "long", say: "One day, our Sun will shrink into that tiny dot.", visual: { type: "compare", from: sunDwarf, to: sun, big: true, open: true } },
    { id: "age", only: "long", say: "Right now it is about four and a half billion years old, roughly halfway through its life.", visual: { type: "body", body: sun, fact: "4.6 billion years old" } },
    { id: "fuel", only: "long", say: "In about five billion years, it will run out of hydrogen in its core.", visual: { type: "body", body: sun, fact: "fuel runs out in ≈ 5 billion years" } },
    { id: "swell", only: "long", say: "Then it will swell into a red giant, about two hundred and fifty times wider than today.", visual: { type: "compare", from: sun, to: redGiant, big: true } },
    {
      id: "swallow", only: "long", say: "It will swallow Mercury and Venus, and probably Earth as well.",
      visual: { type: "orbits", body: redGiant, radiusAu: 1.19, orbits: [{ name: "Mercury", au: 0.39 }, { name: "Venus", au: 0.72 }, { name: "Earth", au: 1 }] },
    },
    { id: "bright", only: "long", say: "It will shine thousands of times brighter than it does now.", visual: { type: "body", body: redGiant, fact: "thousands of times brighter" } },
    { id: "shed", only: "long", say: "And it will blow nearly half of its own mass out into space.", visual: { type: "body", body: redGiant, fact: "loses nearly half its mass" } },
    { id: "core", only: "long", say: "What remains is a white dwarf, the hot, bare core of the dead star.", visual: { type: "body", body: sunDwarf } },
    { id: "wdsize", only: "long", say: "It will be barely bigger than Earth.", visual: { type: "pair", a: earth, b: sunDwarf } },
    { id: "wdmass", only: "long", say: "Yet it will still hold about half the mass of the Sun.", visual: { type: "body", body: sunDwarf, fact: "half the Sun's mass" } },
    { id: "spoon", only: "long", say: "A single teaspoon of it would weigh several tonnes.", visual: { type: "body", body: sunDwarf, fact: "1 teaspoon ≈ several tonnes" } },
    { id: "glow", only: "long", say: "It will not burn anything. It will only glow with leftover heat.", visual: { type: "body", body: sunDwarf, fact: "no fusion, only leftover heat" } },
    { id: "sirius", only: "long", say: "We can already see a star like this. Sirius B is less than nine light-years away.", visual: { type: "body", body: siriusB, fact: "8.6 light-years away" } },
    { id: "packed", only: "long", say: "It packs the mass of the Sun into a ball smaller than Earth.", visual: { type: "pair", a: siriusB, b: earth } },
    { id: "fade", only: "long", say: "Over trillions of years, a white dwarf cools and fades to black.", visual: { type: "body", body: siriusB, fact: "cooling takes trillions of years" } },
    { id: "none", only: "long", say: "The universe is not yet old enough for that to have happened even once.", visual: { type: "body", body: siriusB, fact: "no black dwarfs exist yet" } },
    { id: "smaller", only: "long", say: "And a white dwarf is not even the smallest kind of dead star. A neutron star is only twenty kilometres wide.", visual: { type: "compare", from: neutron, to: siriusB } },
    { id: "end-l", only: "long", say: "But our Sun is too small to become one. Its future is that quiet white dot.", visual: { type: "shrink", body: sunDwarf } },
    { id: "cta", only: "long", say: "Follow for more cosmic scale.", visual: { type: "stars" } },
  ],
};
