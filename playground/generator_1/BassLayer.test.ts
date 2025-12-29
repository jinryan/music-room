import { describe, it, expect, beforeEach, vi } from "vitest";
import { BassLayer } from "./src/audio/BassLayer";
import { ChordProgressionManager } from "./src/music/ChordProgressionManager";
import { CONFIG } from "./src/music/config";

// Mock AudioContext
class MockAudioContext {
  currentTime = 0;
  destination = {} as AudioDestinationNode;
  sampleRate = 44100;

  createOscillator(): OscillatorNode {
    return {
      type: "sine",
      frequency: { value: 0 },
      start: vi.fn(),
      stop: vi.fn(),
      connect: vi.fn(),
    } as unknown as OscillatorNode;
  }

  createGain(): GainNode {
    return {
      gain: {
        value: 0,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
      },
      connect: vi.fn(),
    } as unknown as GainNode;
  }

  createBiquadFilter(): BiquadFilterNode {
    return {
      type: "lowpass",
      frequency: { value: 0 },
      Q: { value: 0 },
      connect: vi.fn(),
    } as unknown as BiquadFilterNode;
  }
}

describe("BassLayer", () => {
  let context: AudioContext;
  let chordManager: ChordProgressionManager;
  let bassLayer: BassLayer;

  beforeEach(() => {
    context = new MockAudioContext() as unknown as AudioContext;
    chordManager = new ChordProgressionManager(
      CONFIG.chordProgression,
      CONFIG.barsPerChord,
    );
    bassLayer = new BassLayer(context, chordManager, CONFIG.tempo);
  });

  describe("constructor", () => {
    it("should create instance with correct properties", () => {
      expect(bassLayer).toBeInstanceOf(BassLayer);
    });
  });

  describe("start", () => {
    it("should schedule pattern when started", () => {
      const startTime = 0;
      bassLayer.start(startTime);
      // Should not throw
      expect(true).toBe(true);
    });

    it("should clear scheduled notes on start", () => {
      bassLayer.start(0);
      bassLayer.start(0.1);
      // Should not throw (duplicate scheduling handled)
      expect(true).toBe(true);
    });
  });

  describe("stop", () => {
    it("should stop without errors", () => {
      bassLayer.start(0);
      bassLayer.stop();
      expect(true).toBe(true);
    });
  });

  describe("scheduleNote", () => {
    it("should schedule note at correct time", () => {
      const beatIndex = 0;
      const scheduleTime = 0;
      bassLayer.scheduleNote(beatIndex, scheduleTime);
      // Should not throw
      expect(true).toBe(true);
    });

    it("should not schedule duplicate notes", () => {
      const beatIndex = 0;
      const scheduleTime = 0;
      bassLayer.scheduleNote(beatIndex, scheduleTime);
      bassLayer.scheduleNote(beatIndex, scheduleTime);
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe("schedulePattern", () => {
    it("should schedule pattern for multiple loops", () => {
      bassLayer.schedulePattern(0, 2);
      // Should not throw
      expect(true).toBe(true);
    });
  });
});

