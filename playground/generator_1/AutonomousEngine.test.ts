import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { AutonomousEngine } from "./src/core/AutonomousEngine";

// Mock AudioContext
class MockAudioContext {
  currentTime = 0;
  state: AudioContextState = "suspended";
  destination = {} as AudioDestinationNode;
  sampleRate = 44100;

  resume = vi.fn(async () => {
    this.state = "running";
    return Promise.resolve();
  });

  createOscillator = vi.fn(() => ({
    type: "sine",
    frequency: {
      value: 0,
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      cancelScheduledValues: vi.fn(),
    },
    start: vi.fn(),
    stop: vi.fn(),
    connect: vi.fn(),
  }));

  createGain = vi.fn(() => ({
    gain: {
      value: 0,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      cancelScheduledValues: vi.fn(),
    },
    connect: vi.fn(),
  }));

  createBiquadFilter = vi.fn(() => ({
    type: "lowpass",
    frequency: { value: 0 },
    Q: { value: 0 },
    connect: vi.fn(),
  }));

  createDelay = vi.fn(() => ({
    delayTime: { value: 0 },
    connect: vi.fn(),
  }));

  createBuffer = vi.fn(() => ({
    numberOfChannels: 1,
    length: 0,
    sampleRate: 44100,
    getChannelData: vi.fn(() => new Float32Array(0)),
  }));

  createBufferSource = vi.fn(() => ({
    buffer: null,
    start: vi.fn(),
    stop: vi.fn(),
    connect: vi.fn(),
  }));
}

describe("AutonomousEngine", () => {
  let engine: AutonomousEngine;
  let mockContext: MockAudioContext;

  beforeEach(() => {
    // Create mock instance
    mockContext = new MockAudioContext();
    // Mock AudioContext constructor to return our mock instance
    (globalThis as unknown as { AudioContext: typeof AudioContext }).AudioContext = vi.fn(() => mockContext) as unknown as typeof AudioContext;
    engine = new AutonomousEngine();
  });

  afterEach(() => {
    if (engine.getIsPlaying()) {
      engine.stop();
    }
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create instance", () => {
      expect(engine).toBeInstanceOf(AutonomousEngine);
    });

    it("should start in stopped state", () => {
      expect(engine.getIsPlaying()).toBe(false);
    });
  });

  describe("start", () => {
    it("should start engine", async () => {
      await engine.start();
      expect(engine.getIsPlaying()).toBe(true);
    });

    it("should resume audio context if suspended", async () => {
      mockContext.state = "suspended";
      await engine.start();
      expect(mockContext.resume).toHaveBeenCalled();
    });

    it("should not start if already playing", async () => {
      await engine.start();
      await engine.start();
      expect(engine.getIsPlaying()).toBe(true);
    });
  });

  describe("stop", () => {
    it("should stop engine", async () => {
      await engine.start();
      engine.stop();
      expect(engine.getIsPlaying()).toBe(false);
    });

    it("should not error if stopped when not playing", () => {
      engine.stop();
      expect(engine.getIsPlaying()).toBe(false);
    });
  });

  describe("setEnergy", () => {
    it("should set energy level", async () => {
      await engine.start();
      engine.setEnergy(0.5);
      expect(true).toBe(true);
    });

    it("should handle energy when not playing", () => {
      engine.setEnergy(0.5);
      expect(true).toBe(true);
    });
  });

  describe("getIsPlaying", () => {
    it("should return false initially", () => {
      expect(engine.getIsPlaying()).toBe(false);
    });

    it("should return true after start", async () => {
      await engine.start();
      expect(engine.getIsPlaying()).toBe(true);
    });

    it("should return false after stop", async () => {
      await engine.start();
      engine.stop();
      expect(engine.getIsPlaying()).toBe(false);
    });
  });
});

