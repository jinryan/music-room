import { describe, it, expect, beforeEach } from "vitest";
import { PhraseStructure } from "./PhraseStructure";

describe("PhraseStructure", () => {
  let phrase: PhraseStructure;

  beforeEach(() => {
    phrase = new PhraseStructure(4, 4); // 4 bars, 4 beats per bar = 16 beats
  });

  describe("constructor", () => {
    it("should create phrase with default 4 bars", () => {
      const defaultPhrase = new PhraseStructure();
      expect(defaultPhrase.getCurrentBeat()).toBe(0);
    });

    it("should create phrase with custom bars", () => {
      const customPhrase = new PhraseStructure(8, 4);
      expect(customPhrase.getCurrentBeat()).toBe(0);
    });
  });

  describe("advance", () => {
    it("should advance beat counter", () => {
      phrase.advance();
      expect(phrase.getCurrentBeat()).toBe(1);
    });

    it("should wrap around at phrase end", () => {
      // Advance to end (15 beats for 4 bars * 4 beats)
      for (let i = 0; i < 16; i++) {
        phrase.advance();
      }
      expect(phrase.getCurrentBeat()).toBe(0); // Should wrap to start
    });
  });

  describe("getPhrasePosition", () => {
    it("should return 0 at phrase start", () => {
      expect(phrase.getPhrasePosition()).toBe(0);
    });

    it("should return 1 at phrase end", () => {
      for (let i = 0; i < 15; i++) {
        phrase.advance();
      }
      expect(phrase.getPhrasePosition()).toBeCloseTo(15 / 16, 2);
    });

    it("should return 0.5 at phrase midpoint", () => {
      for (let i = 0; i < 8; i++) {
        phrase.advance();
      }
      expect(phrase.getPhrasePosition()).toBeCloseTo(0.5, 1);
    });
  });

  describe("isPhrasingPoint", () => {
    it("should be true at phrase start", () => {
      expect(phrase.isPhrasingPoint()).toBe(true);
    });

    it("should be true every 2 bars (8 beats)", () => {
      for (let i = 0; i < 8; i++) {
        phrase.advance();
      }
      expect(phrase.isPhrasingPoint()).toBe(true);
    });

    it("should be false at other beats", () => {
      phrase.advance();
      expect(phrase.isPhrasingPoint()).toBe(false);
    });
  });

  describe("shouldResolve", () => {
    it("should be false at phrase start", () => {
      expect(phrase.shouldResolve()).toBe(false);
    });

    it("should be true at phrase end", () => {
      for (let i = 0; i < 15; i++) {
        phrase.advance();
      }
      expect(phrase.shouldResolve()).toBe(true);
    });

    it("should be false after wrapping", () => {
      for (let i = 0; i < 16; i++) {
        phrase.advance();
      }
      expect(phrase.shouldResolve()).toBe(false); // Back at start
    });
  });

  describe("getContourBias", () => {
    it("should return 'up' in first half", () => {
      expect(phrase.getContourBias()).toBe('up');
      for (let i = 0; i < 7; i++) {
        phrase.advance();
      }
      expect(phrase.getContourBias()).toBe('up');
    });

    it("should return 'down' in second half", () => {
      for (let i = 0; i < 8; i++) {
        phrase.advance();
      }
      expect(phrase.getContourBias()).toBe('down');
      for (let i = 0; i < 7; i++) {
        phrase.advance();
      }
      expect(phrase.getContourBias()).toBe('down');
    });
  });

  describe("reset", () => {
    it("should reset to phrase start", () => {
      phrase.advance();
      phrase.advance();
      phrase.reset();
      expect(phrase.getCurrentBeat()).toBe(0);
      expect(phrase.getPhrasePosition()).toBe(0);
    });
  });

  describe("getCurrentBeat", () => {
    it("should return current beat number", () => {
      expect(phrase.getCurrentBeat()).toBe(0);
      phrase.advance();
      expect(phrase.getCurrentBeat()).toBe(1);
    });
  });
});

