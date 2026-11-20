/**
 * Voice-over script for "Born to Explode". Every line is pinned to the visual
 * timeline: `until` is the beat it must finish before, planet names land
 * exactly on their engulf frames, and the two big hits (ignition, supernova)
 * are left to the sound design.
 */
import type { NarrationLine } from "../../voice/types";
import { PLANETS, T } from "./timeline";

const engulf = (name: string) => PLANETS.find((p) => p.name === name)!.engulf;

export const VOICE = "am_fenrir"; // the channel narrator: clearest male voice in our recognizer test

export const NARRATION: NarrationLine[] = [
  // hook
  { id: "hook1", text: "This star will live ten million years.", at: 0.05, until: 2.2, speed: 1.05 },
  { id: "hook2", text: "And die in a second.", after: "hook1", gap: 0.15, until: T.nebula + 0.1, speed: 1.05 },
  // birth
  { id: "cloud", text: "It begins as a cold, dark cloud of gas.", at: 3.85, until: 6.9 },
  { id: "gravity", text: "Gravity pulls it tighter… and tighter…", after: "cloud", gap: 0.35, until: 9.85 },
  // main sequence
  { id: "mass", text: "Twenty times heavier than our Sun.", at: 11.1, until: 13.55, speed: 1.05 },
  { id: "dot", text: "See that tiny dot? That's the Sun.", at: 13.65, until: 16.3 },
  { id: "burn", text: "It burns blue-hot… and it burns fast.", after: "dot", gap: 0.35, until: T.giant - 0.05 },
  // red supergiant: names land as each planet is swallowed
  { id: "swell", text: "It swells into a red supergiant…", at: T.giant + 0.05, until: engulf("Mercury") - 0.08 },
  { id: "mercury", text: "Mercury.", at: engulf("Mercury") - 0.05, until: engulf("Venus") - 0.08, speed: 1.1 },
  { id: "venus", text: "Venus.", at: engulf("Venus") - 0.05, until: engulf("Earth") - 0.08, speed: 1.1 },
  { id: "earth", text: "Earth.", at: engulf("Earth") - 0.05, until: engulf("Mars") - 0.08, speed: 1.1 },
  { id: "mars", text: "Mars.", at: engulf("Mars") - 0.05, until: engulf("Mars") + 0.9, speed: 1.1 },
  { id: "jupiter", text: "Even Jupiter.", endAt: engulf("Jupiter") + 0.25, until: T.collapse },
  // death
  { id: "fuel", text: "Then the core runs out of fuel.", at: T.collapse + 0.15, until: T.supernova - 0.25 },
  { id: "galaxy", text: "Brighter than a whole galaxy.", at: T.supernova + 1.6, until: T.blackHole - 0.1 },
  // remnant & payoff
  { id: "dense", text: "What's left is so dense, not even light escapes.", at: T.blackHole + 0.15, until: 35.1, speed: 1.1 },
  { id: "bh", text: "A black hole.", after: "dense", gap: 0.2, until: T.dust + 0.05 },
  { id: "dust", text: "And its dust? It became new stars…", at: T.dust + 0.15, until: 38.85 },
  { id: "you", text: "and you.", after: "dust", gap: 0.3, until: T.end - 0.15 },
];
