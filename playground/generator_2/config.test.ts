import { describe, it, expect } from "vitest";
import { CONFIG } from "./src/music/config";

describe("CONFIG", () => {
  it("should have correct tempo", () => {
    expect(CONFIG.tempo).toBe(120);
  });

  it("should have correct key", () => {
    expect(CONFIG.key).toBe("A");
  });

  it("should have 4 chords in progression", () => {
    expect(CONFIG.chordProgression).toHaveLength(4);
  });

  it("should have correct chord names", () => {
    const names = CONFIG.chordProgression.map((c) => c.name);
    expect(names).toEqual(["Am", "F", "C", "G"]);
  });

  it("should have 2 bars per chord", () => {
    expect(CONFIG.barsPerChord).toBe(2);
  });

  it("should have 4 beats per bar", () => {
    expect(CONFIG.beatsPerBar).toBe(4);
  });

  it("should have 8 total bars", () => {
    expect(CONFIG.totalBars).toBe(8);
  });

  it("should have 32 total beats", () => {
    expect(CONFIG.totalBeats).toBe(32);
  });

  it("should have correct chord structure", () => {
    CONFIG.chordProgression.forEach((chord) => {
      expect(chord).toHaveProperty("root");
      expect(chord).toHaveProperty("notes");
      expect(chord).toHaveProperty("name");
      expect(Array.isArray(chord.notes)).toBe(true);
      expect(chord.notes.length).toBeGreaterThan(0);
    });
  });
});

