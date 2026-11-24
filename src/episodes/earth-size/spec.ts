import { NARRATOR, type Body, type EpisodeSpec } from "../../series/types";
import { mars, mercury, moon, venus } from "../bodies";

// Radii in Earth radii (NASA planetary fact sheets). Stephenson 2-18 is a published estimate.
const SUN = 109.2;
const earth: Body = { name: "Earth", kind: "planet", radius: 1, color: "#2a6fd6", surface: "earth", note: "12,742 km wide" };
const neptune: Body = { name: "Neptune", kind: "planet", radius: 3.88, color: "#3f66e0", surface: "plain", note: "almost 4 Earths wide" };
const jupiter: Body = { name: "Jupiter", kind: "planet", radius: 11.2, color: "#d9a877", surface: "bands", note: "11 Earths wide" };
const sun: Body = { name: "The Sun", kind: "star", radius: SUN, temp: 0.55, note: "109 Earths wide" };

// Long cut. Ceres 939 km (Dawn); Pluto 2,377 km (New Horizons); Ceres holds roughly a third of the asteroid
// belt's mass (Dawn-era estimates run from 25% to 39%). Mercury 430 °C / −180 °C, Venus 465 °C and 92 bar,
// Olympus Mons ≈ 22 km, Earth's density 5.51 g/cm³: NASA planetary fact sheets.
const ceres: Body = { name: "Ceres", kind: "planet", radius: 0.0737, color: "#8d8a86", surface: "rocky", note: "939 km wide" };
const pluto: Body = { name: "Pluto", kind: "planet", radius: 0.1865, color: "#c9b29b", surface: "rocky", note: "2,377 km wide" };
export const EARTH_SIZE: EpisodeSpec = {
  id: "earth-size",
  series: "Cosmic Scale",
  episode: 4,
  episodeLong: 6,
  title: "How small is Earth, really?",
  titleLong: "Earth is the giant of the rocky worlds",
  voice: NARRATOR,
  ask: "Did you know Earth was this small?",
  askLong: "Did you know Earth was the biggest rocky world?",
  emphasis: ["ceres", "pluto", "mercury", "venus", "giant", "largest", "densest", "life", "everest", "earth", "moon", "mars", "neptune", "jupiter", "sun", "thousand", "million", "fourteen", "billions", "disappears", "storm"],
  beats: [
    { id: "hook", only: "short", say: "That tiny dot is Earth. This is the Sun, drawn to the same scale.", visual: { type: "compare", from: earth, to: sun, big: true, open: true } },
    { id: "moon-earth", only: "short", say: "Earth is almost four times wider than the Moon.", visual: { type: "compare", from: moon, to: earth } },
    { id: "jupiter-s", only: "short", say: "Jupiter is eleven times wider than Earth.", visual: { type: "compare", from: earth, to: jupiter } },
    { id: "jupvol", only: "short", say: "More than a thousand Earths would fit inside it.", visual: { type: "body", body: jupiter, fact: "holds 1,300 Earths" } },
    { id: "sun", only: "short", say: "And the Sun is about ten times wider than Jupiter.", visual: { type: "compare", from: jupiter, to: sun, big: true } },
    { id: "sunvol", only: "short", say: "You could fit more than a million Earths inside the Sun.", visual: { type: "body", body: sun, fact: "holds 1.3 million Earths" } },
    { id: "lap", only: "short", say: "Light circles the Earth in a blink, but needs fourteen seconds to lap the Sun.", visual: { type: "lap", body: sun, value: 14.6, unit: "seconds" } },
    { id: "end-s", only: "short", say: "And our Sun is only one star among hundreds of billions.", visual: { type: "shrink", body: sun } },
    // ---- long cut: its own story, sharing no lines or pictures with the short

    { id: "hook-l", only: "long", say: "Earth is a giant. That dot beside it is the largest asteroid in the solar system.", visual: { type: "compare", from: ceres, to: earth, big: true, open: true } },
    { id: "ceres", only: "long", say: "It's called Ceres, and it is about nine hundred and forty kilometres wide.", visual: { type: "body", body: ceres } },
    { id: "ceresmass", only: "long", say: "On its own, it holds about a third of all the mass in the asteroid belt.", visual: { type: "body", body: ceres, fact: "≈ a third of the belt's mass · estimate" } },
    { id: "pluto", only: "long", say: "Pluto is two and a half times wider than Ceres.", visual: { type: "compare", from: ceres, to: pluto } },
    { id: "plutomoon", only: "long", say: "But it is still smaller than our own Moon.", visual: { type: "pair", a: pluto, b: moon } },
    { id: "plutoyear", only: "long", say: "One trip around the Sun takes Pluto two hundred and forty-eight years.", visual: { type: "body", body: pluto, fact: "one year: 248 Earth years" } },
    { id: "mercury", only: "long", say: "Mercury, the smallest planet, is only a little wider than the Moon.", visual: { type: "pair", a: moon, b: mercury } },
    { id: "mercday", only: "long", say: "Its days reach four hundred degrees, and its nights fall far below freezing.", visual: { type: "body", body: mercury, fact: "430 °C by day, −180 °C by night" } },
    { id: "mars", only: "long", say: "Mars is next, and it is still only half as wide as Earth.", visual: { type: "pair", a: mercury, b: mars } },
    { id: "olympus", only: "long", say: "Its tallest volcano is more than twice the height of Mount Everest.", visual: { type: "body", body: mars, fact: "Olympus Mons: 22 km tall" } },
    { id: "venus", only: "long", say: "Venus is almost twice as wide as Mars.", visual: { type: "compare", from: mars, to: venus } },
    { id: "twins", only: "long", say: "In size, it is nearly Earth's twin.", visual: { type: "pair", a: venus, b: earth } },
    { id: "venushot", only: "long", say: "But its surface is hot enough to melt lead, under air that would crush you.", visual: { type: "body", body: venus, fact: "≈ 465 °C, 90 × Earth's air pressure" } },
    { id: "largest", only: "long", say: "That leaves Earth as the largest rocky world in the solar system.", visual: { type: "body", body: earth, fact: "largest rocky planet" } },
    { id: "dense", only: "long", say: "It is also the densest planet of them all.", visual: { type: "body", body: earth, fact: "densest planet: 5.5 g/cm³" } },
    { id: "water", only: "long", say: "And it is the only one with oceans of liquid water on its surface.", visual: { type: "body", body: earth, fact: "71% covered by ocean" } },
    { id: "life", only: "long", say: "As far as we know, it is the only world with life.", visual: { type: "body", body: earth, fact: "the only known world with life" } },
    { id: "bigmoon", only: "long", say: "Even its Moon is unusually large, a quarter as wide as the planet it circles.", visual: { type: "compare", from: moon, to: earth } },
    { id: "giants", only: "long", say: "But Neptune, the smallest of the giant planets, is almost four times wider.", visual: { type: "compare", from: earth, to: neptune } },
    { id: "end-l", only: "long", say: "Earth is a giant among the rocks, and a speck next to everything else.", visual: { type: "shrink", body: neptune } },
    { id: "cta", only: "long", say: "Follow for more cosmic scale.", visual: { type: "stars" } },
  ],
};
