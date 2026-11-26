import { NARRATOR, type Body, type EpisodeSpec } from "../../series/types";

// Sizes in light-years (radius = half the width). Nebulae have no hard edge, so every width is an estimate.
// Helix: bright ring nearly 3 ly across (NASA). Orion: about 24 ly across, 1,344–1,500 ly away, the middle
// "star" of Orion's sword (NASA). Carina: about 300 ly (NASA Caldwell 92; ESO quotes 100 for the bright core).
// Tarantula: about 1,000 ly across, 160,000–180,000 ly away; at Orion's distance it would span about 30° of
// sky, 60 full Moons (NASA APOD). NGC 604: almost 1,500 ly across, 2.73 million ly away in M33 (NASA Webb 2024).
// Solar system: Neptune's orbit is 60 AU across = 0.00095 ly (1 ly = 63,241 AU), so the Helix is ≈ 3,000 × wider.
// Photographs: NASA releases, public domain; credits in public/nebulae/CREDITS.md.
// Long cut: Pillars of Creation 4–5 ly tall in the Eagle Nebula (NASA); Crab Nebula, supernova seen in 1054,
// 6–11 ly wide depending on the assumed distance (NASA / Chandra). The Sun formed about 4.6 billion years ago.
const neb = (name: string, width: number, note: string, color: string, color2: string, shape: Body["shape"] = "cloud", image?: string): Body =>
  ({ name, kind: "nebula", radius: width / 2, color, color2, shape, note, image });
const solar: Body = { name: "Our solar system, out to Neptune", kind: "star", radius: 0.000475, temp: 0.55, note: "out to Neptune's orbit" };
const helix = neb("Helix Nebula", 3, "≈ 3 light-years wide", "#ff5a3c", "#3fd0c9", "ring", "nebulae/helix.jpg");
const crab = neb("Crab Nebula", 8, "≈ 6 to 11 light-years wide · estimate", "#ffb05a", "#5ad0ff");
const orion = neb("Orion Nebula", 24, "≈ 24 light-years wide", "#ff5f8a", "#7a5cff", "cloud", "nebulae/orion.jpg");
const eagle = neb("Eagle Nebula", 70, "≈ 70 light-years wide", "#e6a04a", "#3fa58a");
const carina = neb("Carina Nebula", 300, "≈ 300 light-years wide · estimate", "#ff4a3a", "#ffc24a", "cloud", "nebulae/carina.jpg");
const tarantula = neb("Tarantula Nebula", 1000, "≈ 1,000 light-years wide · estimate", "#ff6a3d", "#4f8cff", "cloud", "nebulae/tarantula.jpg");
const ngc604 = neb("NGC 604", 1500, "≈ 1,500 light-years wide · estimate", "#ff3fa0", "#5a6dff", "cloud", "nebulae/ngc604.jpg");
const sunBody: Body = { name: "The Sun", kind: "star", radius: 0.0000001, temp: 0.55, note: "born 4.6 billion years ago" };

export const NEBULAE: EpisodeSpec = {
  id: "nebulae",
  series: "Cosmic Scale",
  episode: 14,
  episodeLong: 15,
  hideTag: ["short"],
  title: "The biggest nebulae, to scale",
  titleLong: "What is a nebula?",
  voice: NARRATOR,
  ask: "Which nebula should get its own video?",
  askLong: "Which nebula is your favourite?",
  emphasis: ["nebulae", "nebula", "solar", "dot", "helix", "orion", "carina", "tarantula", "light-years", "thousand", "moons", "wider", "cloud", "eyes", "stars", "born", "dying", "exploded", "pillars", "sun", "atoms", "gas", "dust"],
  beats: [
    { id: "hook", only: "short", say: "You asked for the biggest nebulae. Our entire solar system is that dot.", visual: { type: "compare", from: solar, to: ngc604, big: true, open: true } },
    { id: "helix", only: "short", say: "Start small. The Helix Nebula is the glowing shell of a dying star, about three light-years wide.", visual: { type: "body", body: helix } },
    { id: "fit", only: "short", say: "Our solar system would fit across it three thousand times.", visual: { type: "body", body: helix, fact: "≈ 3,000 solar systems wide" } },
    { id: "orion", only: "short", say: "The Orion Nebula, where new stars are born, is twenty-four light-years across.", visual: { type: "compare", from: helix, to: orion } },
    { id: "carina", only: "short", say: "The Carina Nebula is about three hundred.", visual: { type: "compare", from: orion, to: carina } },
    { id: "tarantula", only: "short", say: "The Tarantula Nebula, in a neighbouring galaxy, is around a thousand light-years wide.", visual: { type: "compare", from: carina, to: tarantula, big: true } },
    { id: "sky", only: "short", say: "If it were as close as Orion, it would stretch across sixty full Moons in our sky.", visual: { type: "body", body: tarantula, fact: "at Orion's distance: 60 full Moons wide" } },
    { id: "ngc", only: "short", say: "And N G C six oh four is wider still, at almost fifteen hundred light-years.", visual: { type: "pair", a: { ...tarantula, note: "≈ 1,000 light-years" }, b: { ...ngc604, note: "≈ 1,500 light-years" } } },
    { id: "cross", only: "short", say: "Even light takes about fifteen hundred years to cross it.", visual: { type: "body", body: ngc604, fact: "≈ 1,500 years to cross at light speed" } },
    { id: "end", only: "short", say: "And inside its galaxy, it is still just one small cloud.", visual: { type: "shrink", body: ngc604 } },

    { id: "hook-l", only: "long", say: "You can see this cloud with your own eyes. Our whole solar system is that dot.", visual: { type: "compare", from: solar, to: orion, big: true, open: true } },
    { id: "sword", only: "long", say: "It is the Orion Nebula, the fuzzy middle star in Orion's sword.", visual: { type: "body", body: orion, fact: "the middle \"star\" of Orion's sword" } },
    { id: "size", only: "long", say: "It is about twenty-four light-years across, and more than a thousand light-years away.", visual: { type: "body", body: orion } },
    { id: "what", only: "long", say: "A nebula is simply a cloud of gas and dust floating in space.", visual: { type: "body", body: orion, fact: "a cloud of gas and dust" } },
    { id: "nursery", only: "long", say: "Some are nurseries, where gravity squeezes the gas into new stars.", visual: { type: "body", body: orion, fact: "new stars are forming inside" } },
    { id: "eagle", only: "long", say: "In the Eagle Nebula, columns of gas called the Pillars of Creation stand about four light-years tall.", visual: { type: "compare", from: orion, to: eagle } },
    { id: "left", only: "long", say: "Other nebulae are what stars leave behind when they die.", visual: { type: "body", body: helix, fact: "the remains of a star" } },
    { id: "helix-l", only: "long", say: "The Helix Nebula is the outer layers of a dying star like our Sun.", visual: { type: "body", body: helix } },
    { id: "future", only: "long", say: "In about five billion years, the Sun will make one too.", visual: { type: "body", body: helix, fact: "the Sun's future" } },
    { id: "crab", only: "long", say: "And the Crab Nebula is the wreck of a star that exploded.", visual: { type: "compare", from: helix, to: crab } },
    { id: "year", only: "long", say: "People on Earth saw that explosion in the year ten fifty-four.", visual: { type: "body", body: crab, fact: "supernova seen in 1054" } },
    { id: "grow", only: "long", say: "Almost a thousand years later, it is still expanding.", visual: { type: "body", body: crab, fact: "still expanding today" } },
    { id: "big", only: "long", say: "The biggest nebulae are far larger. The Tarantula Nebula is around a thousand light-years wide.", visual: { type: "compare", from: orion, to: tarantula, big: true } },
    { id: "began", only: "long", say: "Every star you can see began inside a cloud like these.", visual: { type: "body", body: tarantula, fact: "every star starts in a nebula" } },
    { id: "sun-l", only: "long", say: "That includes our Sun, more than four billion years ago.", visual: { type: "body", body: sunBody } },
    { id: "atoms", only: "long", say: "And the atoms in your body were once part of that cloud.", visual: { type: "shrink", body: orion } },
    { id: "cta", only: "long", say: "Follow for more cosmic scale.", visual: { type: "stars" } },
  ],
};
