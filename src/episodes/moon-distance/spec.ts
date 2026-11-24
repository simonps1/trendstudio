import { NARRATOR, type EpisodeSpec, type Visual } from "../../series/types";
import { earth, jupiter, mars, mercury, moon, neptune, saturn, sun, uranus, venus } from "../bodies";

// Distances in Earth radii (6,371 km). Moon: 384,400 km on average, 405,500 km at its farthest (NASA).
// Sun: 149.6 million km. Light: 299,792 km/s. The Moon recedes 3.8 cm a year (lunar laser ranging).
const AVG = 384400 / 6371, FAR = 405500 / 6371, AU = 149.6e6 / 6371;
const gap = (extra: Partial<Extract<Visual, { type: "gap" }>> = {}): Visual => ({ type: "gap", a: earth, b: moon, distance: AVG, ...extra });

export const MOON_DISTANCE: EpisodeSpec = {
  id: "moon-distance",
  series: "Cosmic Scale",
  episode: 10,
  episodeLong: 13,
  title: "How far away is the Moon, really?",
  voice: NARRATOR,
  ask: "Would you make the 3-day trip?",
  emphasis: ["moon", "earth", "earths", "light", "second", "planet", "days", "months", "sun", "centimetres", "twelve", "scale", "eclipse"],
  beats: [
    // cold open on the most surprising picture: the planets stacked inside the gap
    { id: "fit", only: "short", say: "Every other planet in the solar system fits between Earth and the Moon.", visual: gap({ distance: FAR, fill: [mercury, jupiter, mars, saturn, venus, uranus, neptune], note: "at its farthest" }), hold: 0.3 },
    { id: "fit-l", only: "long", say: "The Moon is so far from Earth that every other planet fits in between.", visual: gap({ distance: FAR, fill: [mercury, jupiter, mars, saturn, venus, uranus, neptune], note: "at its farthest" }), hold: 0.3 },
    { id: "hook", say: "This is the real distance between them, drawn to scale.", visual: gap({ note: "384,400 km" }) },
    { id: "thirty", say: "It is about thirty Earths away.", visual: gap({ ruler: { step: 2, label: "Earths apart" } }) },
    { id: "light", say: "Even light, the fastest thing there is, needs more than a second to cross it.", visual: gap({ trip: { label: "at light speed", seconds: 1.28 } }) },
    { id: "apollo", say: "The Apollo astronauts needed three days to make the trip.", visual: gap({ trip: { label: "3 days" } }) },
    { id: "jet", only: "long", say: "A passenger jet would need about eighteen days.", visual: gap({ trip: { label: "18 days by jet" } }) },
    { id: "car", say: "At highway speed, the drive would take more than five months.", visual: gap({ trip: { label: "5 months by car" } }) },
    { id: "quarter", only: "long", say: "The Moon itself is about a quarter as wide as Earth.", visual: { type: "pair", a: moon, b: earth } },
    { id: "side", only: "long", say: "We always see the same side of it.", visual: { type: "body", body: moon, fact: "one side always faces Earth" } },
    { id: "tides", only: "long", say: "Its pull is what drives our ocean tides.", visual: { type: "body", body: moon, fact: "it raises the tides" } },
    { id: "heat", only: "long", say: "By day its surface is hotter than boiling water, and at night it drops far below freezing.", visual: { type: "body", body: moon, fact: "120 °C by day, −130 °C by night" } },
    { id: "born", only: "long", say: "Scientists think it formed when a world the size of Mars struck the young Earth.", visual: { type: "body", body: moon, fact: "about 4.5 billion years old" } },
    { id: "twelve", only: "long", say: "Only twelve people have ever walked on it.", visual: { type: "body", body: moon, fact: "12 moonwalkers, 1969 to 1972" } },
    { id: "sunfar", only: "long", say: "The Sun is almost four hundred times farther away than the Moon.", visual: { type: "gap", a: earth, b: sun, distance: AU, note: "150 million km" } },
    { id: "sunlight", only: "long", say: "Sunlight needs more than eight minutes to make that trip.", visual: { type: "gap", a: earth, b: sun, distance: AU, trip: { label: "8 min 19 s" } } },
    { id: "same", only: "long", say: "It is also four hundred times wider, which is why the Sun and Moon look the same size in our sky.", visual: { type: "body", body: sun, fact: "400 × wider, 400 × farther" } },
    { id: "eclipse", only: "long", say: "That coincidence is what makes a total solar eclipse possible.", visual: { type: "body", body: moon, fact: "a perfect fit for an eclipse" } },
    { id: "drift", say: "And every year, the Moon drifts almost four centimetres farther away.", visual: { type: "body", body: moon, fact: "3.8 cm farther every year" } },
    { id: "cta", only: "long", say: "Follow for more cosmic scale.", visual: { type: "stars" } },
  ],
};
