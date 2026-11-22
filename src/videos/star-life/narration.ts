/**
 * Voice-over script for "Born to Explode". Every line is pinned to the visual
 * timeline: `until` is the beat it must finish before, planet names land
 * exactly on their engulf frames, and the two big hits (ignition, supernova)
 * are left to the sound design.
 */
import type { NarrationLine } from "../../voice/types";
import { NARRATOR } from "../../series/types";
import { T } from "./timeline";

export const VOICE = NARRATOR; // the channel narrator: Chatterbox's built-in male voice

export const NARRATION: NarrationLine[] = [
  // hook
  { id: "hook1", text: "This star will live for ten million years,", at: 0.05, until: 2.3 },
  { id: "hook2", text: "then die in one second.", after: "hook1", gap: 0.1, until: T.nebula + 0.25 },
  // birth
  { id: "cloud", text: "It starts out as a cold, dark cloud of gas.", at: 3.85, until: 6.9 },
  { id: "gravity", text: "Gravity squeezes it until it ignites.", after: "cloud", gap: 0.35, until: 9.85 },
  // main sequence
  { id: "mass", text: "Twenty times heavier than our Sun.", at: 11.1, until: 13.55, speed: 1.05 },
  { id: "dot", text: "See that tiny dot? That's the Sun.", at: 13.65, until: 16.3 },
  { id: "burn", text: "It burns blue-hot, and burns through its fuel fast.", after: "dot", gap: 0.35, until: T.giant - 0.05 },
  // red supergiant: the planets are swallowed as their names are spoken (timeline reads the word times)
  { id: "swell", text: "Then it swells into a red supergiant,", at: T.giant + 0.05, until: 21.25 },
  { id: "planets", text: "big enough to swallow Mercury, Venus, Earth, and Mars.", at: 21.3, until: 24.75 },
  { id: "jupiter", text: "Even Jupiter.", after: "planets", gap: 0.15, until: T.collapse + 0.1 },
  // death
  { id: "fuel", text: "Its fuel runs out. The core collapses.", at: T.collapse + 0.15, until: T.supernova - 0.2 },
  { id: "galaxy", text: "The star explodes, brighter than a galaxy.", at: T.supernova + 0.7, until: T.blackHole - 0.1 },
  // remnant & payoff
  { id: "dense", text: "What's left is so dense that not even light escapes:", at: T.blackHole + 0.15, until: 35.1, speed: 1.1 },
  { id: "bh", text: "a black hole.", after: "dense", gap: 0.2, until: T.dust + 0.05 },
  { id: "dust", text: "The dust it threw out became new stars, planets,", at: T.dust + 0.15, until: 38.85 },
  { id: "you", text: "and you.", after: "dust", gap: 0.3, until: T.end - 0.15 },
];
