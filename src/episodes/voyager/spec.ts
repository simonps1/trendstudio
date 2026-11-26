import { NARRATOR, type Body, type EpisodeSpec, type Visual } from "../../series/types";
import { earth, jupiter, saturn } from "../bodies";

// Voyager 1 (NASA/JPL). Launched 5 September 1977. First picture of Earth and Moon in one frame: 18 September 1977,
// from 11.66 million km. Jupiter flyby March 1979 (Great Red Spot photo: 25 February 1979). Saturn flyby November 1980;
// the close pass of Titan bent its path up out of the plane of the planets. "Pale Blue Dot": 14 February 1990, from
// about 6 billion km (40 AU), part of the 60-frame "family portrait", its final images; the cameras were then
// switched off to save power. Crossed into interstellar space in August 2012. In November 2026 it reaches one
// light-day from Earth (25.9 billion km): NASA marked it on 17 November 2026. Transmitter: about 23 watts, received
// by the Deep Space Network's 70-metre dishes. Golden Record: 12-inch gold-plated copper disc with sounds, music
// and greetings. In about 40,000 years it passes within 1.6 light-years of the star Gliese 445.
// Photographs and credits: public/photos/CREDITS.md.
const DAY = 25.9e9 / 6371; // one light-day in Earth radii
const probe: Body = { name: "Voyager 1", kind: "star", radius: 0.5, temp: 0.9, note: "farthest human-made object" };
const photo = (image: string, ring: string, extra: Partial<Extract<Visual, { type: "photo" }>> = {}): Visual => ({ type: "photo", image: `photos/voyager/${image}.jpg`, ring, ...extra });
const DOT = { at: [0.5, 0.56] as [number, number], r: 0.075 };

export const VOYAGER: EpisodeSpec = {
  id: "voyager",
  series: "Cosmic Scale",
  episode: 16,
  episodeLong: 17,
  title: "The farthest photo of Earth ever taken",
  titleLong: "Voyager 1: one light-day from home",
  voice: NARRATOR,
  ask: "Would you ride along?",
  askLong: "What would you put on the record?",
  emphasis: ["dot", "earth", "real", "billion", "voyager", "farthest", "jupiter", "saturn", "titan", "home", "pixel", "cameras", "light", "day", "seventy", "bulb", "interstellar", "golden", "record", "star", "never", "everything", "moon", "thousand"],
  beats: [
    // cold open on the real photograph, with the dot ringed
    { id: "hook", say: "That dot is Earth. This is a real photo, taken from six billion kilometres away.", visual: photo("pale-blue-dot", "Earth · real photo, 1990", DOT) },
    { id: "who", say: "The camera belonged to Voyager 1, the farthest thing humans have ever built.", visual: photo("voyager-art", "Voyager 1 · artist's concept", { fit: "contain" }) },
    { id: "launch", say: "It left Earth in nineteen seventy-seven.", visual: photo("launch", "Launch · 5 September 1977") },
    { id: "pair", only: "long", say: "Two weeks later it looked back, and took the first picture of Earth and the Moon together.", visual: photo("earth-moon", "Earth and Moon · 18 September 1977", { fit: "contain" }) },
    { id: "jupiter", say: "In nineteen seventy-nine it reached Jupiter, and sent back this.", visual: photo("jupiter", "Jupiter's Great Red Spot · Voyager 1, 1979", { fit: "contain" }) },
    { id: "big", only: "long", say: "Jupiter is so big that more than a thousand Earths would fit inside it.", visual: { type: "compare", from: earth, to: jupiter } },
    { id: "saturn", say: "Then came Saturn, in nineteen eighty.", visual: photo("saturn", "Saturn and two moons · Voyager 1, 1980", { fit: "contain" }) },
    { id: "titan", only: "long", say: "A close pass by its moon Titan flung Voyager up and out of the plane of the planets.", visual: { type: "body", body: saturn, fact: "Titan flyby: no more planets ahead" } },
    { id: "turn", say: "After that, there was nothing left to visit. So in nineteen ninety, it turned around for one last look at home.", visual: photo("pale-blue-dot-full", "From its final photos · 14 February 1990", { fit: "contain" }) },
    { id: "pixel", only: "long", say: "Earth filled less than a single pixel. Then the cameras were switched off for good.", visual: photo("pale-blue-dot", "Cameras off since 1990", DOT) },
    { id: "far", say: "Today it is about twenty-six billion kilometres from Earth.", visual: { type: "gap", a: earth, b: probe, distance: DAY, note: "≈ 26 billion km · 2026" } },
    { id: "light", say: "Even its radio signal, moving at the speed of light, needs a whole day to reach us.", visual: { type: "gap", a: earth, b: probe, distance: DAY, trip: { label: "≈ 1 day at light speed" } } },
    { id: "dish", only: "long", say: "We catch that signal with dishes seventy metres wide.", visual: photo("antenna", "Deep Space Network · Goldstone, California") },
    { id: "bulb", only: "long", say: "Its transmitter uses about as much power as the light bulb in a fridge.", visual: photo("voyager-art", "Transmitter: about 23 watts", { fit: "contain" }) },
    { id: "out", only: "long", say: "In twenty twelve, it became the first spacecraft to enter interstellar space, the space between the stars.", visual: { type: "stars" } },
    { id: "record", say: "It carries a golden record, with music, greetings and sounds from Earth.", visual: photo("golden-record", "The Golden Record", { fit: "contain" }) },
    { id: "star", only: "long", say: "In about forty thousand years, it will drift past another star.", visual: { type: "stars" } },
    // the last picture is the first one again, so the video loops into its own opening
    { id: "end", say: "It will never come back. And everything we have ever known is still on that dot.", visual: photo("pale-blue-dot", "Earth", DOT) },
    { id: "cta", only: "long", say: "Follow for more cosmic scale.", visual: { type: "stars" } },
  ],
};
