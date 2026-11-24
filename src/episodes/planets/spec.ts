import { NARRATOR, type Body, type EpisodeSpec } from "../../series/types";
import { earth, jupiter, mars, mercury, neptune, saturn, uranus, venus } from "../bodies";

// Sizes: NASA planetary fact sheets. Other facts: NASA Solar System Exploration pages for each planet.
// Long cut: Saturn. Main rings ≈ 280,000 km across and ≈ 10 m thick, ring rain (gone in ≈ 100–300 million years,
// O'Donoghue et al. 2019), density 0.69 g/cm³, day 10.7 h, year 29.4 years, winds to 1,800 km/h, the ≈ 30,000 km
// north-polar hexagon, Titan 5,150 km with methane lakes: NASA Saturn pages and Cassini results. Moons: 274
// recognised by the IAU in March 2025 (more reported since), against about 150 for all other planets together.
// Light lap: 2π × 60,268 km ÷ 299,792 km/s ≈ 1.26 s.
const titan: Body = { name: "Titan", kind: "planet", radius: 0.404, color: "#d9a441", surface: "plain", note: "5,150 km wide" };

export const PLANETS: EpisodeSpec = {
  id: "planets",
  series: "Cosmic Scale",
  episode: 9,
  episodeLong: 12,
  title: "Every planet, from smallest to largest",
  titleLong: "Saturn: the planet that would float",
  voice: NARRATOR,
  ask: "Which planet would you visit?",
  askLong: "Rings or moons: which is cooler?",
  emphasis: ["titan", "ice", "float", "hydrogen", "helium", "winds", "storm", "moons", "telescope", "metres", "raining", "mercury", "mars", "venus", "earth", "neptune", "uranus", "saturn", "jupiter", "smallest", "biggest", "rings", "tiny", "float", "hottest"],
  beats: [
    { id: "hook", only: "short", say: "That dot is the smallest planet in our solar system. This is the biggest.", visual: { type: "compare", from: mercury, to: jupiter, big: true, open: true } },
    { id: "mercury", only: "short", say: "Mercury is the smallest, not much bigger than our Moon.", visual: { type: "body", body: mercury } },
    { id: "mars", only: "short", say: "Mars comes next, about half as wide as Earth.", visual: { type: "compare", from: mercury, to: mars } },
    { id: "venus", only: "short", say: "Then Venus, which is almost exactly Earth's size.", visual: { type: "compare", from: mars, to: venus } },
    { id: "twins", only: "short", say: "Side by side, you can hardly tell the difference.", visual: { type: "pair", a: venus, b: earth } },
    { id: "neptune", only: "short", say: "Neptune is nearly four times wider than Earth.", visual: { type: "compare", from: earth, to: neptune } },
    { id: "uranus", only: "short", say: "Uranus beats it, but only just.", visual: { type: "pair", a: neptune, b: uranus } },
    { id: "saturn", only: "short", say: "Saturn is more than twice as wide, even without its rings.", visual: { type: "compare", from: uranus, to: saturn } },
    { id: "jupiter", only: "short", say: "And Jupiter is the biggest of them all.", visual: { type: "pair", a: saturn, b: jupiter } },
    { id: "heavy", only: "short", say: "It outweighs every other planet combined, twice over.", visual: { type: "body", body: jupiter, fact: "2.5 × all other planets combined" } },
    { id: "end", only: "short", say: "And next to the Sun, even Jupiter is tiny.", visual: { type: "shrink", body: jupiter } },
    // ---- long cut: its own story, sharing no lines or pictures with the short

    { id: "hook-l", only: "long", say: "Earth is that dot. This is Saturn, and its rings reach wider still.", visual: { type: "compare", from: earth, to: saturn, big: true, open: true } },
    { id: "wide", only: "long", say: "Saturn is more than nine times wider than Earth.", visual: { type: "body", body: saturn } },
    { id: "rings", only: "long", say: "Its main rings stretch about two hundred and eighty thousand kilometres from edge to edge.", visual: { type: "body", body: saturn, fact: "rings: ≈ 280,000 km across" } },
    { id: "ringjup", only: "long", say: "That is twice the width of Jupiter.", visual: { type: "pair", a: jupiter, b: saturn } },
    { id: "thin", only: "long", say: "Yet in most places the rings are only about ten metres thick.", visual: { type: "body", body: saturn, fact: "rings: ≈ 10 m thick" } },
    { id: "ice", only: "long", say: "They are made of countless pieces of ice, from tiny grains to chunks the size of a house.", visual: { type: "body", body: saturn, fact: "countless pieces of ice" } },
    { id: "rain", only: "long", say: "And they are slowly raining down onto the planet. In a few hundred million years, they could be gone.", visual: { type: "body", body: saturn, fact: "gone in ≈ 100 to 300 million years · estimate" } },
    { id: "float", only: "long", say: "Saturn is the only planet lighter than water. In a big enough ocean, it would float.", visual: { type: "body", body: saturn, fact: "less dense than water" } },
    { id: "gas", only: "long", say: "That is because it is made almost entirely of hydrogen and helium.", visual: { type: "body", body: saturn, fact: "mostly hydrogen and helium" } },
    { id: "lap-l", only: "long", say: "Even light needs more than a second to travel once around it.", visual: { type: "lap", body: saturn, value: 1.3, unit: "seconds" } },
    { id: "day", only: "long", say: "A day there lasts less than eleven hours, but a year lasts twenty-nine of ours.", visual: { type: "body", body: saturn, fact: "day: 10.7 hours · year: 29 Earth years" } },
    { id: "wind", only: "long", say: "Its winds blow at up to eighteen hundred kilometres an hour.", visual: { type: "body", body: saturn, fact: "winds up to 1,800 km/h" } },
    { id: "hex", only: "long", say: "And at its north pole sits a six-sided storm that is wider than two Earths.", visual: { type: "compare", from: earth, to: saturn } },
    { id: "moons-l", only: "long", say: "Saturn has more than two hundred and seventy known moons, more than every other planet combined.", visual: { type: "body", body: saturn, fact: "270+ known moons" } },
    { id: "titan", only: "long", say: "Its largest moon, Titan, is bigger than the planet Mercury.", visual: { type: "pair", a: mercury, b: titan } },
    { id: "titanair", only: "long", say: "Titan has thick air, and lakes of liquid methane on its surface.", visual: { type: "body", body: titan, fact: "thick air, lakes of methane" } },
    { id: "liquid", only: "long", say: "Apart from Earth, it is the only world we know with liquid on its surface.", visual: { type: "compare", from: titan, to: earth } },
    { id: "second", only: "long", say: "Among the planets, only Jupiter is bigger than Saturn.", visual: { type: "pair", a: saturn, b: jupiter } },
    { id: "end-l", only: "long", say: "And you can see those rings yourself, with a small telescope.", visual: { type: "shrink", body: saturn } },
    { id: "cta", only: "long", say: "Follow for more cosmic scale.", visual: { type: "stars" } },
  ],
};
