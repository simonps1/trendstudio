import { NARRATOR, type Body, type EpisodeSpec } from "../../series/types";
import { sun } from "../bodies";

// Event-horizon radius = 2.95 km per solar mass (Schwarzschild). Radii below in Earth radii (6,371 km).
// Masses: Cygnus X-1 21.2 M☉ (Miller-Jones et al. 2021); Sagittarius A* 4.3 million M☉ (GRAVITY 2022);
// M87* 6.5 billion M☉ (Event Horizon Telescope 2019); TON 618 ≈ 66 billion M☉ (Shemmer et al. 2004, an estimate).
// Looks follow what each one is: a bare hole has nothing falling in, so it only bends the starlight behind it;
// Cygnus X-1 strips hot blue-white gas from a companion star; Sagittarius A* is dim and red; M87* fires a jet
// (first seen in 1918); TON 618 is a quasar, among the brightest objects known.
const hole = (name: string, km: number, note: string, look: Partial<Body> = {}): Body => ({ name, kind: "hole", radius: km / 6371, note, ...look });
const earthHole = hole("Earth as a black hole", 8.87e-6, "1.8 cm wide", { disc: 0 });
const sunHole = hole("The Sun as a black hole", 2.95, "6 km wide", { disc: 0 });
const cygnus = hole("Cygnus X-1", 62.5, "≈ 125 km wide", { temp: 1, disc: 0.34 });
const sgrA = hole("Sagittarius A*", 1.269e7, "≈ 18 Suns wide", { temp: 0.08, disc: 0.5 });
const m87 = hole("M87*", 1.918e10, "wider than our solar system", { temp: 0.42, disc: 0.3, jet: 0.55 });
const ton = hole("TON 618", 1.947e11, "≈ 2,600 × the Earth–Sun distance · estimate", { temp: 0.8, disc: 0.17, jet: 1 });

export const BLACK_HOLES: EpisodeSpec = {
  id: "black-holes",
  series: "Cosmic Scale",
  episode: 4,
  title: "How big is the biggest black hole?",
  voice: NARRATOR,
  ask: "Which one scares you most?",
  emphasis: ["black", "hole", "marble", "sun", "kilometres", "galaxy", "solar", "system", "light", "days", "billion", "million", "never"],
  beats: [
    { id: "hook", say: "That tiny dot is our Sun. This is one of the biggest black holes ever found.", visual: { type: "compare", from: sun, to: ton, big: true, open: true } },
    { id: "marble", say: "Crush the whole Earth into a black hole, and it would be the size of a marble.", visual: { type: "body", body: earthHole, fact: "the whole Earth: 1.8 cm wide" } },
    { id: "mass", only: "long", say: "A black hole's size depends only on how much mass it holds.", visual: { type: "body", body: earthHole, fact: "more mass, wider hole" } },
    { id: "sunhole", say: "Do the same to the Sun, and it would be just six kilometres wide.", visual: { type: "compare", from: earthHole, to: sunHole } },
    { id: "horizon", only: "long", say: "Nothing that crosses its edge can ever come back, not even light.", visual: { type: "body", body: sunHole, fact: "the event horizon" } },
    { id: "cygnus", only: "long", say: "Cygnus X-1, the first black hole ever identified, is about a hundred and twenty kilometres wide.", visual: { type: "compare", from: sunHole, to: cygnus } },
    { id: "cygmass", only: "long", say: "It weighs as much as twenty-one Suns.", visual: { type: "body", body: cygnus, fact: "21 Suns of mass" } },
    { id: "sgr", say: "The black hole at the centre of our galaxy is eighteen Suns wide.", visual: { type: "compare", from: sun, to: sgrA } },
    { id: "sgrmass", only: "long", say: "It holds the mass of four million Suns.", visual: { type: "body", body: sgrA, fact: "4 million Suns of mass" } },
    { id: "sgrpic", only: "long", say: "We took its first picture in twenty twenty-two.", visual: { type: "body", body: sgrA, fact: "first image: 2022" } },
    { id: "m87", say: "The one in the galaxy M eighty-seven is wider than our entire solar system.", visual: { type: "compare", from: sgrA, to: m87 } },
    { id: "m87first", only: "long", say: "It was the first black hole ever photographed.", visual: { type: "body", body: m87, fact: "first image: 2019" } },
    { id: "m87mass", only: "long", say: "It holds the mass of six and a half billion Suns.", visual: { type: "body", body: m87, fact: "6.5 billion Suns of mass" } },
    {
      id: "orbits", say: "Put it where our Sun is, and it would swallow every planet with room to spare.",
      visual: { type: "orbits", body: m87, radiusAu: 128, orbits: [{ name: "Jupiter", au: 5.2, label: false }, { name: "Neptune", au: 30 }, { name: "Pluto", au: 39.5, label: false }, { name: "Kuiper belt", au: 55 }] },
    },
    { id: "ton", say: "And Ton six one eight is ten times wider than that.", visual: { type: "compare", from: m87, to: ton, big: true } },
    { id: "tonmass", only: "long", say: "It holds the mass of about sixty-six billion Suns.", visual: { type: "body", body: ton, fact: "≈ 66 billion Suns · estimate" } },
    { id: "tonlight", only: "long", say: "Its light has travelled more than ten billion years to reach us.", visual: { type: "body", body: ton, fact: "light left 10+ billion years ago" } },
    { id: "lap", say: "Even light would need forty-seven days to travel around it.", visual: { type: "lap", body: ton, value: 47, unit: "days", decimals: 0 } },
    { id: "end", say: "And nearly every large galaxy has a supermassive black hole at its centre.", visual: { type: "shrink", body: ton } },
    { id: "cta", only: "long", say: "Follow for more cosmic scale.", visual: { type: "stars" } },
  ],
};
