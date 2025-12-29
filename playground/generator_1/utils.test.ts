import { describe, it, expect } from "vitest";
import { noteToFrequency } from "./src/utils/noteToFrequency";

describe("noteToFrequency", () => {
  it("should convert A4 to 440Hz", () => {
    expect(noteToFrequency("A4")).toBeCloseTo(440, 1);
  });

  it("should convert C4 to correct frequency", () => {
    // C4 = MIDI note 60, frequency = 440 * 2^((60-69)/12) ≈ 261.63 Hz
    expect(noteToFrequency("C4")).toBeCloseTo(261.63, 1);
  });

  it("should convert sharps correctly", () => {
    // C#4 = MIDI note 61
    expect(noteToFrequency("C#4")).toBeCloseTo(277.18, 1);
  });

  it("should handle different octaves", () => {
    const a3 = noteToFrequency("A3");
    const a4 = noteToFrequency("A4");
    const a5 = noteToFrequency("A5");
    
    // Each octave doubles the frequency
    expect(a4).toBeCloseTo(a3 * 2, 1);
    expect(a5).toBeCloseTo(a4 * 2, 1);
  });

  it("should handle low octaves", () => {
    const a2 = noteToFrequency("A2");
    expect(a2).toBeCloseTo(110, 1); // A2 = 110 Hz
  });

  it("should throw error for invalid format", () => {
    expect(() => noteToFrequency("invalid")).toThrow("Invalid note format");
    // H4 doesn't match the format because H is not in A-G range
    expect(() => noteToFrequency("H4")).toThrow("Invalid note format");
    expect(() => noteToFrequency("A")).toThrow("Invalid note format");
  });
});

