import { describe, it, expect } from "vitest";
import { RhythmicPattern } from "./RhythmicPattern";

describe("RhythmicPattern", () => {
  let pattern: RhythmicPattern;
  const beatDuration = 0.5; // 120 BPM = 0.5 seconds per beat

  beforeEach(() => {
    pattern = new RhythmicPattern();
  });

  describe("getNextDuration", () => {
    it("should return simple pattern at low variation", () => {
      const duration = pattern.getNextDuration(0.1);
      expect(duration).toBe("8n");
    });

    it("should return duration strings", () => {
      const duration = pattern.getNextDuration(0.5);
      expect(typeof duration).toBe("string");
      expect(["8n", "16n", "8n.", "4n", "8t"]).toContain(duration);
    });

    it("should cycle through pattern", () => {
      pattern.getNextDuration(0.1);
      pattern.getNextDuration(0.1);
      pattern.getNextDuration(0.1);
      const duration = pattern.getNextDuration(0.1);
      expect(duration).toBe("8n"); // Should cycle back
    });
  });

  describe("parseDuration", () => {
    it("should parse 8n to 0.5 beats", () => {
      const duration = pattern.parseDuration("8n", beatDuration);
      expect(duration).toBeCloseTo(0.25, 2); // 0.5 beats * 0.5 seconds = 0.25 seconds
    });

    it("should parse 16n to 0.25 beats", () => {
      const duration = pattern.parseDuration("16n", beatDuration);
      expect(duration).toBeCloseTo(0.125, 2); // 0.25 beats * 0.5 seconds = 0.125 seconds
    });

    it("should parse 4n to 1 beat", () => {
      const duration = pattern.parseDuration("4n", beatDuration);
      expect(duration).toBeCloseTo(0.5, 2); // 1 beat * 0.5 seconds = 0.5 seconds
    });

    it("should parse dotted 8n (8n.) to 0.75 beats", () => {
      const duration = pattern.parseDuration("8n.", beatDuration);
      expect(duration).toBeCloseTo(0.375, 2); // 0.75 beats * 0.5 seconds = 0.375 seconds
    });

    it("should parse triplet 8t to 0.33 beats", () => {
      const duration = pattern.parseDuration("8t", beatDuration);
      expect(duration).toBeCloseTo(0.166, 1); // ~0.33 beats * 0.5 seconds ≈ 0.166 seconds
    });

    it("should default to 8n for invalid format", () => {
      const duration = pattern.parseDuration("invalid", beatDuration);
      expect(duration).toBeCloseTo(0.25, 2); // Default 0.5 beats * 0.5 seconds
    });
  });

  describe("pattern selection", () => {
    it("should select simple pattern at variation 0.1", () => {
      // Run multiple times to check pattern selection
      const durations: string[] = [];
      for (let i = 0; i < 10; i++) {
        durations.push(pattern.getNextDuration(0.1));
      }
      // All should be "8n" for simple pattern
      expect(durations.every(d => d === "8n")).toBe(true);
    });

    it("should select varied patterns at high variation", () => {
      const durations: string[] = [];
      for (let i = 0; i < 20; i++) {
        durations.push(pattern.getNextDuration(0.9));
      }
      // Should have variety
      const uniqueDurations = new Set(durations);
      expect(uniqueDurations.size).toBeGreaterThan(1);
    });
  });

  describe("reset", () => {
    it("should reset pattern index", () => {
      pattern.getNextDuration(0.1);
      pattern.getNextDuration(0.1);
      pattern.reset();
      const duration = pattern.getNextDuration(0.1);
      expect(duration).toBe("8n"); // Should start from beginning
    });
  });
});

