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

// Long cut: Sagittarius A*. Distance ≈ 26,000 light-years and mass 4.3 million M☉ (GRAVITY 2022); the star S2
// orbits in 16.05 years and reached ≈ 7,650 km/s in 2018 (GRAVITY 2018); Nobel Prize in Physics 2020 (Genzel, Ghez);
// first image 2022 (Event Horizon Telescope). Light lap: 2π × 12.7 million km ÷ 299,792 km/s ≈ 4.4 minutes.
export const BLACK_HOLES: EpisodeSpec = {
  id: "black-holes",
  series: "Cosmic Scale",
  episode: 8,
  episodeLong: 11,
  title: "How big is the biggest black hole?",
  titleLong: "The black hole at the centre of our galaxy",
  voice: NARRATOR,
  ask: "Which one scares you most?",
  askLong: "Would you want to see it up close?",
  emphasis: ["sagittarius", "centre", "dust", "stars", "sixteen", "nobel", "picture", "shadow", "quiet", "closest", "minutes", "black", "hole", "marble", "sun", "kilometres", "galaxy", "solar", "system", "light", "days", "billion", "million", "never"],
  beats: [
    { id: "hook", only: "short", say: "Our Sun is that tiny dot. Above it is one of the biggest black holes ever found.", visual: { type: "compare", from: sun, to: ton, big: true, open: true } },
    { id: "marble", only: "short", say: "Crush the whole Earth into a black hole, and it would be the size of a marble.", visual: { type: "body", body: earthHole, fact: "the whole Earth: 1.8 cm wide" } },
    { id: "sunhole", only: "short", say: "Do the same to the Sun, and it would be just six kilometres wide.", visual: { type: "compare", from: earthHole, to: sunHole } },
    { id: "sgr", only: "short", say: "The black hole at the centre of our galaxy is eighteen Suns wide.", visual: { type: "compare", from: sun, to: sgrA } },
    { id: "m87", only: "short", say: "The one in the galaxy M eighty-seven is wider than our entire solar system.", visual: { type: "compare", from: sgrA, to: m87 } },
    {
      id: "orbits", only: "short", say: "Put it where our Sun is, and it would swallow every planet with room to spare.",
      visual: { type: "orbits", body: m87, radiusAu: 128, orbits: [{ name: "Jupiter", au: 5.2, label: false }, { name: "Neptune", au: 30 }, { name: "Pluto", au: 39.5, label: false }, { name: "Kuiper belt", au: 55 }] },
    },
    { id: "ton", only: "short", say: "And Ton six one eight is ten times wider than that.", visual: { type: "compare", from: m87, to: ton, big: true } },
    { id: "lap", only: "short", say: "Even light would need forty-seven days to travel around it.", visual: { type: "lap", body: ton, value: 47, unit: "days", decimals: 0 } },
    { id: "end", only: "short", say: "And nearly every large galaxy has a supermassive black hole at its centre.", visual: { type: "shrink", body: ton } },
    // ---- long cut: its own story, sharing no lines or pictures with the short

    { id: "hook-l", only: "long", say: "There is a black hole at the centre of our galaxy. Our Sun is that dot beside it.", visual: { type: "compare", from: sun, to: sgrA, big: true, open: true } },
    { id: "name", only: "long", say: "Astronomers call it Sagittarius A star, and it is about eighteen Suns wide.", visual: { type: "body", body: sgrA } },
    { id: "sgrmass", only: "long", say: "It holds the mass of more than four million Suns.", visual: { type: "body", body: sgrA, fact: "4.3 million Suns of mass" } },
    { id: "stellar", only: "long", say: "Black holes made by dying stars are tiny next to it.", visual: { type: "compare", from: cygnus, to: sgrA, big: true } },
    { id: "far", only: "long", say: "It sits twenty-six thousand light-years from Earth.", visual: { type: "body", body: sgrA, fact: "26,000 light-years away" } },
    { id: "dust", only: "long", say: "From here, it is hidden behind thick clouds of dust.", visual: { type: "body", body: sgrA, fact: "hidden behind dust" } },
    { id: "dark", only: "long", say: "For decades, nobody could see it. They could only watch the stars around it.", visual: { type: "body", body: sgrA, fact: "found by its pull on nearby stars" } },
    { id: "s2", only: "long", say: "One of those stars circles it every sixteen years.", visual: { type: "body", body: sgrA, fact: "star S2: one orbit in 16 years" } },
    { id: "speed", only: "long", say: "At its closest, that star moves at almost three percent of the speed of light.", visual: { type: "body", body: sgrA, fact: "up to 7,650 km every second" } },
    { id: "nobel", only: "long", say: "Tracking it proved the black hole was real, and won a Nobel Prize in twenty twenty.", visual: { type: "body", body: sgrA, fact: "Nobel Prize in Physics, 2020" } },
    { id: "pic", only: "long", say: "We finally took its picture in twenty twenty-two.", visual: { type: "body", body: sgrA, fact: "first image: 2022" } },
    { id: "ring", only: "long", say: "The image shows a ring of glowing gas around a dark shadow.", visual: { type: "body", body: sgrA, fact: "a glowing ring around a shadow" } },
    { id: "lap-l", only: "long", say: "Light needs more than four minutes to travel once around it.", visual: { type: "lap", body: sgrA, value: 4.4, unit: "minutes" } },
    { id: "quiet", only: "long", say: "For its size, it is surprisingly quiet. Very little is falling in.", visual: { type: "body", body: sgrA, fact: "a quiet, dim black hole" } },
    { id: "m87-l", only: "long", say: "And it is small for its kind. The black hole in the galaxy M eighty-seven is fifteen hundred times wider.", visual: { type: "compare", from: sgrA, to: m87, big: true } },
    { id: "m87mass", only: "long", say: "That one holds six and a half billion Suns.", visual: { type: "body", body: m87, fact: "6.5 billion Suns of mass" } },
    { id: "every", only: "long", say: "Nearly every large galaxy has a giant black hole like this at its heart.", visual: { type: "body", body: m87, fact: "one in nearly every large galaxy" } },
    { id: "end-l", only: "long", say: "Ours just happens to be the closest one.", visual: { type: "shrink", body: sgrA } },
    { id: "cta", only: "long", say: "Follow for more cosmic scale.", visual: { type: "stars" } },
  ],
};
