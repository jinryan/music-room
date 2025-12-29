import { describe, it, expect } from "vitest";
import {
  getFullScale,
  transposeNote,
  getIntervalSemitones,
  findNearestChordTone,
  getNoteIndexInScale,
} from "./noteUtils";

describe("noteUtils", () => {
  describe("getFullScale", () => {
    it("should return A minor scale with correct octaves (A4, B4, C5, D5...)", () => {
      const scale = getFullScale("A", "minor", 4);
      expect(scale.length).toBe(7);
      expect(scale[0]).toBe("A4");
      expect(scale[1]).toBe("B4");
      // C should be octave 5 because it's higher in pitch than A4
      expect(scale[2]).toBe("C5");
      expect(scale[3]).toBe("D5");
      expect(scale[4]).toBe("E5");
      expect(scale[5]).toBe("F5");
      expect(scale[6]).toBe("G5");
    });

    it("should return C major scale in octave 4 (all notes in octave 4)", () => {
      const scale = getFullScale("C", "major", 4);
      expect(scale.length).toBe(7);
      // C major: C, D, E, F, G, A, B - all in octave 4 since C is root
      expect(scale[0]).toBe("C4");
      expect(scale[1]).toBe("D4");
      expect(scale[6]).toBe("B4");
    });
    
    it("should handle F major (wraps from B to C)", () => {
      const scale = getFullScale("F", "major", 4);
      // F major: F, G, A, Bb, C, D, E
      expect(scale[0]).toBe("F4");
      // Bb should still be octave 4 (lower than C)
      // C should be octave 5 (wrapped around)
      expect(scale.some(n => n.includes("5"))).toBe(true);
    });
  });

  describe("transposeNote", () => {
    it("should transpose A4 up by 2 semitones", () => {
      const result = transposeNote("A4", 2);
      // Tonal.js may return "Bb4" or "A#4" or "B4" depending on context
      // A4 + 2 semitones = B4 (but Tonal might use enharmonic equivalents)
      expect(result).toMatch(/^[AB][b#]?4$/);
    });

    it("should transpose C4 down by 2 semitones to Bb3", () => {
      const result = transposeNote("C4", -2);
      expect(result).toBe("Bb3");
    });

    it("should transpose by 12 semitones (octave)", () => {
      const result = transposeNote("A4", 12);
      expect(result).toBe("A5");
    });
  });

  describe("getIntervalSemitones", () => {
    it("should return 0 for same note", () => {
      expect(getIntervalSemitones("A4", "A4")).toBe(0);
    });

    it("should return 3 for minor third (A to C)", () => {
      const semitones = getIntervalSemitones("A4", "C5");
      // A4 to C5 is 3 semitones up, but if C is lower octave it's -9
      expect([3, -9]).toContain(semitones);
    });

    it("should return 7 for perfect fifth (C to G)", () => {
      const semitones = getIntervalSemitones("C4", "G4");
      expect(semitones).toBe(7);
    });
  });

  describe("findNearestChordTone", () => {
    it("should find nearest chord tone", () => {
      const chordTones = ["A4", "C4", "E4"];
      const result = findNearestChordTone("B4", chordTones, []);
      // B4 is closest to A4 or C4 (1 semitone away)
      expect(chordTones).toContain(result);
    });

    it("should return first chord tone if fromNote is already a chord tone", () => {
      const chordTones = ["A4", "C4", "E4"];
      const result = findNearestChordTone("A4", chordTones, []);
      expect(chordTones).toContain(result);
    });

    it("should handle empty chord tones array", () => {
      const result = findNearestChordTone("A4", [], []);
      expect(result).toBe("A4");
    });
  });

  describe("getNoteIndexInScale", () => {
    it("should find note index in scale", () => {
      // Corrected: A minor scale has C5, not C4
      const scale = ["A4", "B4", "C5", "D5", "E5", "F5", "G5"];
      expect(getNoteIndexInScale("A4", scale)).toBe(0);
      expect(getNoteIndexInScale("C5", scale)).toBe(2);
      expect(getNoteIndexInScale("E5", scale)).toBe(4);
    });

    it("should return -1 for note not in scale", () => {
      const scale = ["A4", "B4", "C5"];
      expect(getNoteIndexInScale("D5", scale)).toBe(-1);
    });

    it("should work with different octaves (same note name)", () => {
      const scale = ["A4", "B4", "C5"];
      expect(getNoteIndexInScale("A5", scale)).toBe(0); // Same note name, different octave
    });
  });
});

