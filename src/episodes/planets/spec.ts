import { NARRATOR, type EpisodeSpec } from "../../series/types";
import { earth, jupiter, mars, mercury, neptune, saturn, uranus, venus } from "../bodies";

// Sizes: NASA planetary fact sheets. Other facts: NASA Solar System Exploration pages for each planet.
export const PLANETS: EpisodeSpec = {
  id: "planets",
  series: "Cosmic Scale",
  episode: 5,
  title: "Every planet, from smallest to largest",
  voice: NARRATOR,
  ask: "Which planet would you visit?",
  emphasis: ["mercury", "mars", "venus", "earth", "neptune", "uranus", "saturn", "jupiter", "smallest", "biggest", "rings", "tiny", "float", "hottest"],
  beats: [
    { id: "hook", only: "short", say: "That dot is the smallest planet in our solar system. This is the biggest.", visual: { type: "compare", from: mercury, to: jupiter, big: true, open: true } },
    { id: "hook-l", only: "long", say: "Jupiter is so big that the smallest planet is just that dot beneath it.", visual: { type: "compare", from: mercury, to: jupiter, big: true, open: true } },
    { id: "mercury", say: "Mercury is the smallest, not much bigger than our Moon.", visual: { type: "body", body: mercury } },
    { id: "mercyear", only: "long", say: "A year there lasts just eighty-eight days.", visual: { type: "body", body: mercury, fact: "one year: 88 days" } },
    { id: "mars", say: "Mars comes next, about half as wide as Earth.", visual: { type: "compare", from: mercury, to: mars } },
    { id: "olympus", only: "long", say: "It has the tallest volcano in the solar system.", visual: { type: "body", body: mars, fact: "Olympus Mons: 22 km tall" } },
    { id: "venus", say: "Then Venus, which is almost exactly Earth's size.", visual: { type: "compare", from: mars, to: venus } },
    { id: "hot", only: "long", say: "It's the hottest planet, hot enough to melt lead.", visual: { type: "body", body: venus, fact: "≈ 465 °C at the surface" } },
    { id: "twins", say: "Side by side, you can hardly tell the difference.", visual: { type: "pair", a: venus, b: earth } },
    { id: "rocky", only: "long", say: "Earth is the largest of the four rocky planets.", visual: { type: "body", body: earth, fact: "largest rocky planet" } },
    { id: "neptune", say: "Neptune is nearly four times wider than Earth.", visual: { type: "compare", from: earth, to: neptune } },
    { id: "nepyear", only: "long", say: "One trip around the Sun takes it a hundred and sixty-five years.", visual: { type: "body", body: neptune, fact: "one year: 165 Earth years" } },
    { id: "uranus", say: "Uranus beats it, but only just.", visual: { type: "pair", a: neptune, b: uranus } },
    { id: "tilt", only: "long", say: "Uranus spins on its side, like a rolling ball.", visual: { type: "body", body: uranus, fact: "tilted 98°" } },
    { id: "saturn", say: "Saturn is more than twice as wide, even without its rings.", visual: { type: "compare", from: uranus, to: saturn } },
    { id: "rings", only: "long", say: "Its rings are wider than Jupiter, yet mostly just metres thick.", visual: { type: "body", body: saturn, fact: "rings: ≈ 10 m thick" } },
    { id: "float", only: "long", say: "Saturn is so light that it would float in water.", visual: { type: "body", body: saturn, fact: "less dense than water" } },
    { id: "jupiter", say: "And Jupiter is the biggest of them all.", visual: { type: "pair", a: saturn, b: jupiter } },
    { id: "heavy", say: "It outweighs every other planet combined, twice over.", visual: { type: "body", body: jupiter, fact: "2.5 × all other planets combined" } },
    { id: "moons", only: "long", say: "It has around a hundred known moons.", visual: { type: "body", body: jupiter, fact: "≈ 100 known moons" } },
    { id: "end", say: "And next to the Sun, even Jupiter is tiny.", visual: { type: "shrink", body: jupiter } },
    { id: "cta", only: "long", say: "Follow for more cosmic scale.", visual: { type: "stars" } },
  ],
};
