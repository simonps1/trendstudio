import { NARRATOR, type EpisodeSpec, type Visual } from "../../series/types";
import { earth, jupiter, mars, mercury, moon, neptune, saturn, sun, uranus, venus } from "../bodies";

// Distances in Earth radii (6,371 km). Moon: 384,400 km on average, 405,500 km at its farthest (NASA).
// Sun: 149.6 million km. Light: 299,792 km/s. The Moon recedes 3.8 cm a year (lunar laser ranging).
const AVG = 384400 / 6371, FAR = 405500 / 6371, AU = 149.6e6 / 6371;
const gap = (extra: Partial<Extract<Visual, { type: "gap" }>> = {}): Visual => ({ type: "gap", a: earth, b: moon, distance: AVG, ...extra });

// Long cut: why eclipses work. Sun 1.39 million km wide vs Moon 3,475 km (≈ 400 ×); 149.6 million km vs 384,400 km
// (≈ 389 ×). Longest totality 7 min 32 s; a given place sees totality about once in 375 years (Meeus); the last
// total eclipse comes in roughly 600 million years (NASA Goddard, R. Vondrak 2017). Corona temperature: NASA.

export const MOON_DISTANCE: EpisodeSpec = {
  id: "moon-distance",
  series: "Cosmic Scale",
  episode: 10,
  episodeLong: 13,
  title: "How far away is the Moon, really?",
  titleLong: "Why the Sun and Moon look the same size",
  voice: NARRATOR,
  ask: "Would you make the 3-day trip?",
  askLong: "Have you ever seen a total eclipse?",
  emphasis: ["cover", "wider", "farther", "same", "night", "coincidence", "ring", "leaving", "million", "match", "atmosphere", "moon", "earth", "earths", "light", "second", "planet", "days", "months", "sun", "centimetres", "twelve", "scale", "eclipse"],
  beats: [
    // cold open on the most surprising picture: the planets stacked inside the gap
    { id: "fit", only: "short", say: "Every other planet in the solar system fits between Earth and the Moon.", visual: gap({ distance: FAR, fill: [mercury, jupiter, mars, saturn, venus, uranus, neptune], note: "at its farthest" }), hold: 0.3 },
    { id: "hook", only: "short", say: "This is the real distance between them, drawn to scale.", visual: gap({ note: "384,400 km" }) },
    { id: "thirty", only: "short", say: "It is about thirty Earths away.", visual: gap({ ruler: { step: 2, label: "Earths apart" } }) },
    { id: "light", only: "short", say: "Even light, the fastest thing there is, needs more than a second to cross it.", visual: gap({ trip: { label: "at light speed", seconds: 1.28 } }) },
    { id: "apollo", only: "short", say: "The Apollo astronauts needed three days to make the trip.", visual: gap({ trip: { label: "3 days" } }) },
    { id: "car", only: "short", say: "At highway speed, the drive would take more than five months.", visual: gap({ trip: { label: "5 months by car" } }) },
    { id: "drift", only: "short", say: "And every year, the Moon drifts almost four centimetres farther away.", visual: { type: "body", body: moon, fact: "3.8 cm farther every year" } },
    // ---- long cut: its own story, sharing no lines or pictures with the short

    // cold open on a real photograph of totality (NASA, 8 April 2024; see public/photos/CREDITS.md)
    { id: "hook-l", only: "long", say: "This is a real photo. The Moon is covering the entire Sun. So how can something so small do that?", visual: { type: "photo", image: "photos/eclipse-totality.jpg", ring: "Total solar eclipse · 8 April 2024" } },
    { id: "wider", only: "long", say: "The Sun is four hundred times wider than the Moon.", visual: { type: "compare", from: moon, to: sun, big: true } },
    { id: "near", only: "long", say: "But the Moon is far closer to us. This is the real gap, drawn to scale.", visual: gap({ note: "384,400 km" }) },
    { id: "sunfar", only: "long", say: "The Sun is almost four hundred times farther away.", visual: { type: "gap", a: earth, b: sun, distance: AU, note: "150 million km" } },
    { id: "sunlight", only: "long", say: "Its light needs more than eight minutes to reach us.", visual: { type: "gap", a: earth, b: sun, distance: AU, trip: { label: "8 min 19 s" } } },
    { id: "same", only: "long", say: "Four hundred times wider, and four hundred times farther. So in our sky, they look the same size.", visual: { type: "body", body: sun, fact: "400 × wider, 400 × farther" } },
    { id: "cover", only: "long", say: "That is why the Moon can slide in front of the Sun and cover it exactly.", visual: { type: "body", body: moon, fact: "a perfect fit for an eclipse" } },
    { id: "night", only: "long", say: "For a few minutes, day turns to night.", visual: { type: "photo", image: "photos/eclipse-diamond-ring.jpg", ring: "totality: 7.5 minutes at most" } },
    { id: "corona", only: "long", say: "And the Sun's faint outer atmosphere appears around the black disc of the Moon.", visual: { type: "photo", image: "photos/eclipse-totality.jpg", ring: "the corona: over a million degrees" } },
    { id: "rare", only: "long", say: "From any one place on Earth, that happens only about once every four centuries.", visual: { type: "body", body: earth, fact: "one place: about once in 375 years" } },
    { id: "luck", only: "long", say: "It is a coincidence. Nothing requires the two to match.", visual: { type: "pair", a: moon, b: earth } },
    { id: "orbit", only: "long", say: "And the match is not perfect, because the Moon's distance changes as it orbits.", visual: gap({ distance: FAR, note: "405,500 km at its farthest" }) },
    { id: "annular", only: "long", say: "When it is far away, it looks too small, and leaves a ring of sunlight around its edge.", visual: { type: "body", body: moon, fact: "an annular eclipse: the ring of fire" } },
    { id: "leaving", only: "long", say: "The Moon is also slowly leaving us, by almost four centimetres every year.", visual: gap({ ruler: { step: 2, label: "Earths apart" } }) },
    { id: "past", only: "long", say: "Long ago it was much closer, and looked far bigger in the sky.", visual: { type: "body", body: moon, fact: "once much closer to Earth" } },
    { id: "last", only: "long", say: "In about six hundred million years, it will be too small to cover the Sun at all.", visual: { type: "body", body: sun, fact: "last total eclipse: ≈ 600 million years · estimate" } },
    { id: "ringonly", only: "long", say: "After that, every eclipse will leave a ring.", visual: { type: "body", body: moon, fact: "only ring eclipses after that" } },
    { id: "end-l", only: "long", say: "We just happen to live in the window when they match.", visual: { type: "shrink", body: sun } },
    { id: "cta", only: "long", say: "Follow for more cosmic scale.", visual: { type: "stars" } },
  ],
};
