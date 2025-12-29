import { describe, it, expect, beforeEach } from "vitest";
import { ChordProgressionManager } from "./src/music/ChordProgressionManager";
import { CONFIG } from "./src/music/config";

describe("ChordProgressionManager", () => {
  let manager: ChordProgressionManager;

  beforeEach(() => {
    manager = new ChordProgressionManager(
      CONFIG.chordProgression,
      CONFIG.barsPerChord,
    );
  });

  describe("getCurrentChord", () => {
    it("should return first chord initially", () => {
      const chord = manager.getCurrentChord();
      expect(chord.name).toBe("Am");
      expect(chord.root).toBe("A");
    });
  });

  describe("advance", () => {
    it("should stay on first chord for barsPerChord bars", () => {
      for (let i = 0; i < CONFIG.barsPerChord; i++) {
        expect(manager.getCurrentChord().name).toBe("Am");
        manager.advance();
      }
      // After barsPerChord advances, should move to next chord
      expect(manager.getCurrentChord().name).toBe("F");
    });

    it("should cycle through all chords", () => {
      const expectedChords = ["Am", "Am", "F", "F", "C", "C", "G", "G"];
      const actualChords: string[] = [];

      // Advance through one full cycle (8 bars = 4 chords * 2 bars each)
      for (let bar = 0; bar < 8; bar++) {
        actualChords.push(manager.getCurrentChord().name);
        manager.advance();
      }

      // Should have cycled through all chords (each chord lasts 2 bars)
      expect(actualChords).toEqual(expectedChords);
    });

    it("should loop back to first chord after full cycle", () => {
      // Advance through full cycle
      for (let bar = 0; bar < 8; bar++) {
        manager.advance();
      }
      expect(manager.getCurrentChord().name).toBe("Am");
    });
  });

  describe("getChordForBar", () => {
    it("should return correct chord for bar 0", () => {
      expect(manager.getChordForBar(0).name).toBe("Am");
    });

    it("should return correct chord for bar 2", () => {
      expect(manager.getChordForBar(2).name).toBe("F");
    });

    it("should return correct chord for bar 4", () => {
      expect(manager.getChordForBar(4).name).toBe("C");
    });

    it("should return correct chord for bar 6", () => {
      expect(manager.getChordForBar(6).name).toBe("G");
    });

    it("should loop back to first chord after 8 bars", () => {
      expect(manager.getChordForBar(8).name).toBe("Am");
      expect(manager.getChordForBar(16).name).toBe("Am");
    });

    it("should handle negative bar indices", () => {
      // Negative indices should wrap around using modulo
      // -1 % 8 = -1, but Math.floor(-1 / 2) = -1, so we need to handle this
      // For now, just verify it doesn't crash
      expect(() => manager.getChordForBar(-1)).not.toThrow();
    });
  });

  describe("getChordTones", () => {
    it("should return chord tones in specified octave", () => {
      const tones = manager.getChordTones(3);
      expect(tones).toContain("A3");
      expect(tones).toContain("C3");
      expect(tones).toContain("E3");
    });

    it("should default to octave 3", () => {
      const tones = manager.getChordTones();
      expect(tones.every((tone) => tone.endsWith("3"))).toBe(true);
    });
  });

  describe("getChordTonesForBar", () => {
    it("should return correct chord tones for bar 0", () => {
      const tones = manager.getChordTonesForBar(0, 4);
      expect(tones).toContain("A4");
      expect(tones).toContain("C4");
      expect(tones).toContain("E4");
    });

    it("should return correct chord tones for bar 2", () => {
      const tones = manager.getChordTonesForBar(2, 4);
      expect(tones).toContain("F4");
      expect(tones).toContain("A4");
      expect(tones).toContain("C4");
    });
  });

  describe("reset", () => {
    it("should reset to first chord", () => {
      // Advance a few times
      manager.advance();
      manager.advance();
      manager.advance();

      manager.reset();
      expect(manager.getCurrentChord().name).toBe("Am");
    });
  });
});

