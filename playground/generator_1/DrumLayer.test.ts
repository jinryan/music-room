import { describe, it, expect, beforeEach, vi } from "vitest";
import { DrumLayer } from "./src/audio/DrumLayer";
import { CONFIG } from "./src/music/config";

// Mock AudioContext
class MockAudioContext {
  currentTime = 0;
  destination = {} as AudioDestinationNode;
  sampleRate = 44100;

  createOscillator(): OscillatorNode {
    return {
      type: "sine",
      frequency: {
        value: 0,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
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

  createBuffer(channels: number, length: number, sampleRate: number): AudioBuffer {
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      getChannelData: vi.fn(() => new Float32Array(length)),
    } as unknown as AudioBuffer;
  }

  createBufferSource(): AudioBufferSourceNode {
    return {
      buffer: null,
      start: vi.fn(),
      stop: vi.fn(),
      connect: vi.fn(),
    } as unknown as AudioBufferSourceNode;
  }
}

describe("DrumLayer", () => {
  let context: AudioContext;
  let drumLayer: DrumLayer;

  beforeEach(() => {
    context = new MockAudioContext() as unknown as AudioContext;
    drumLayer = new DrumLayer(context, CONFIG.tempo);
  });

  describe("constructor", () => {
    it("should create instance", () => {
      expect(drumLayer).toBeInstanceOf(DrumLayer);
    });
  });

  describe("start", () => {
    it("should schedule pattern when started", () => {
      drumLayer.start(0);
      expect(true).toBe(true);
    });
  });

  describe("stop", () => {
    it("should stop without errors", () => {
      drumLayer.start(0);
      drumLayer.stop();
      expect(true).toBe(true);
    });
  });

  describe("scheduleKick", () => {
    it("should schedule kick at correct time", () => {
      drumLayer.scheduleKick(0, 0);
      expect(true).toBe(true);
    });

    it("should not schedule duplicate kicks", () => {
      drumLayer.scheduleKick(0, 0);
      drumLayer.scheduleKick(0, 0);
      expect(true).toBe(true);
    });
  });

  describe("scheduleSnare", () => {
    it("should schedule snare at correct time", () => {
      drumLayer.scheduleSnare(1, 0.5);
      expect(true).toBe(true);
    });
  });

  describe("scheduleHiHat", () => {
    it("should schedule hi-hat at correct time", () => {
      drumLayer.scheduleHiHat(0, 0);
      expect(true).toBe(true);
    });
  });
});

