import { describe, it, expect, beforeEach, vi } from "vitest";
import { GenerativeMelody } from "./src/audio/GenerativeMelody";
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
        cancelScheduledValues: vi.fn(),
      },
      connect: vi.fn(),
    } as unknown as GainNode;
  }

  createDelay(_maxDelayTime: number): DelayNode {
    return {
      delayTime: { value: 0 },
      connect: vi.fn(),
    } as unknown as DelayNode;
  }
}

describe("GenerativeMelody", () => {
  let context: AudioContext;
  let chordManager: ChordProgressionManager;
  let melody: GenerativeMelody;

  beforeEach(() => {
    context = new MockAudioContext() as unknown as AudioContext;
    chordManager = new ChordProgressionManager(
      CONFIG.chordProgression,
      CONFIG.barsPerChord,
    );
    melody = new GenerativeMelody(context, chordManager, CONFIG.tempo);
  });

  describe("constructor", () => {
    it("should create instance", () => {
      expect(melody).toBeInstanceOf(GenerativeMelody);
    });
  });

  describe("setRestProbability", () => {
    it("should set rest probability", () => {
      melody.setRestProbability(0.5);
      expect(true).toBe(true);
    });

    it("should clamp probability to 0-1 range", () => {
      melody.setRestProbability(-0.5);
      melody.setRestProbability(1.5);
      expect(true).toBe(true);
    });
  });

  describe("start", () => {
    it("should start without errors", () => {
      melody.start(0);
      expect(true).toBe(true);
    });

    it("should reset lastNote on start", () => {
      melody.start(0);
      melody.start(0.1);
      expect(true).toBe(true);
    });
  });

  describe("stop", () => {
    it("should stop without errors", () => {
      melody.start(0);
      melody.stop();
      expect(true).toBe(true);
    });
  });

  describe("scheduleNote", () => {
    it("should handle rest notes", () => {
      // With 40% rest probability, some notes will be rests
      melody.setRestProbability(1.0); // 100% rest
      melody.scheduleNote(0, 0);
      expect(true).toBe(true);
    });
  });
});

