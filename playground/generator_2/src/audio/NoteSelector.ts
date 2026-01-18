/**
 * NoteSelector - Handles melodic note selection logic
 * Separates musical decision-making from audio synthesis
 */

import {
  getFullScale,
  transposeNote,
  findNearestChordTone,
  getIntervalSemitones,
} from "../utils/noteUtils";
import { CONFIG } from "../music/config";
import type { MelodicBehavior } from "./melodyConfig";
import { DEFAULT_MELODY_CONFIG } from "./melodyConfig";

/** Information about the current beat position */
export interface BeatInfo {
  barIndex: number;
  beatInBar: number; // 0-7 for eighth notes
  isStrongBeat: boolean;
  isDownbeat: boolean;
}

/** Result of note selection */
export interface NoteSelectionResult {
  note: string | null;
  source: string;
  isRest: boolean;
}

/** State for tracking melodic direction */
export interface DirectionState {
  direction: 1 | -1;
  stepsInDirection: number;
}

/**
 * Handles the logic for selecting the next melody note
 */
export class NoteSelector {
  private config: MelodicBehavior;
  private directionState: DirectionState;

  constructor(config: MelodicBehavior = DEFAULT_MELODY_CONFIG.melodic) {
    this.config = config;
    this.directionState = { direction: 1, stepsInDirection: 0 };
  }

  /**
   * Reset the direction state
   */
  reset(): void {
    this.directionState = { direction: 1, stepsInDirection: 0 };
  }

  /**
   * Get the current melodic direction
   */
  getDirection(): 1 | -1 {
    return this.directionState.direction;
  }

  /**
   * Build the extended scale for melody generation
   */
  getExtendedScale(): string[] {
    const scale4 = getFullScale(CONFIG.key, "minor", 4);
    const scale5 = getFullScale(CONFIG.key, "minor", 5);
    return [...scale4, ...scale5];
  }

  /**
   * Get extended chord tones (both octaves)
   */
  getExtendedChordTones(
    getChordTonesForBar: (barIndex: number, octave: number) => string[],
    barIndex: number
  ): string[] {
    const tones4 = getChordTonesForBar(barIndex, 4);
    const tones5 = getChordTonesForBar(barIndex, 5);
    return [...tones4, ...tones5];
  }

  /**
   * Calculate beat information from eighth note index
   */
  calculateBeatInfo(eighthNoteIndex: number): BeatInfo {
    const barIndex = Math.floor(eighthNoteIndex / 8);
    const beatInBar = eighthNoteIndex % 8;
    const isStrongBeat = beatInBar % 4 === 0; // Beats 1 and 3
    const isDownbeat = beatInBar % 2 === 0;

    return { barIndex, beatInBar, isStrongBeat, isDownbeat };
  }

  /**
   * Determine if we should rest on this beat
   */
  shouldRest(restProbability: number, isStrongBeat: boolean): boolean {
    const effectiveProb = isStrongBeat
      ? restProbability * this.config.strongBeatRestReduction
      : restProbability;
    return Math.random() < effectiveProb;
  }

  /**
   * Select starting note (first note of a phrase)
   */
  selectStartingNote(chordTones: string[]): string {
    if (chordTones.length === 0) return "A4"; // Fallback
    
    const startIndex = Math.random() < this.config.rootPreference
      ? 0
      : (chordTones.length > this.config.preferredStartInterval
        ? this.config.preferredStartInterval
        : 0);
    
    return chordTones[startIndex];
  }

  /**
   * Find note position in scale (handles enharmonics)
   */
  findNoteInScale(note: string, scale: string[]): number {
    const exactIndex = scale.indexOf(note);
    if (exactIndex !== -1) return exactIndex;

    // Try pitch-based matching for enharmonics
    for (let i = 0; i < scale.length; i++) {
      if (getIntervalSemitones(note, scale[i]) === 0) return i;
    }
    return -1;
  }

  /**
   * Get simple chord tone step - move to nearest chord tone
   */
  selectSimpleChordTone(
    fromNote: string,
    chordTones: string[],
    scale: string[]
  ): string {
    if (chordTones.length === 0) return fromNote;

    let nearestTone = chordTones[0];
    let minDistance = Infinity;

    // Find nearest chord tone within preferred interval range
    for (const tone of chordTones) {
      const distance = getIntervalSemitones(fromNote, tone);
      if (distance > 0 && distance <= 4 && distance < minDistance) {
        minDistance = distance;
        nearestTone = tone;
      }
    }

    // If no close chord tone found, search in current direction
    if (minDistance === Infinity) {
      const fromIndex = this.findNoteInScale(fromNote, scale);
      if (fromIndex !== -1) {
        for (const tone of chordTones) {
          const toneIndex = this.findNoteInScale(tone, scale);
          if (toneIndex !== -1) {
            const step = toneIndex - fromIndex;
            const matchesDirection =
              (this.directionState.direction > 0 && step > 0) ||
              (this.directionState.direction < 0 && step < 0);
            if (matchesDirection && Math.abs(step) < Math.abs(minDistance)) {
              minDistance = step;
              nearestTone = tone;
            }
          }
        }
      }
    }

    return nearestTone;
  }

  /**
   * Get scale step toward nearest chord tone
   */
  selectScaleStepTowardChordTone(
    currentIndex: number,
    scale: string[],
    chordTones: string[]
  ): string {
    let targetIndex = -1;
    let minSteps = Infinity;

    // Find target chord tone in preferred direction
    for (const tone of chordTones) {
      const toneIndex = this.findNoteInScale(tone, scale);
      if (toneIndex === -1) continue;

      const steps = toneIndex - currentIndex;
      const matchesDirection =
        (this.directionState.direction > 0 && steps > 0) ||
        (this.directionState.direction < 0 && steps < 0);
      
      if (matchesDirection && Math.abs(steps) < minSteps) {
        minSteps = Math.abs(steps);
        targetIndex = toneIndex;
      }
    }

    // Fallback: pick closest chord tone regardless of direction
    if (targetIndex === -1) {
      for (const tone of chordTones) {
        const toneIndex = this.findNoteInScale(tone, scale);
        if (toneIndex !== -1 && toneIndex !== currentIndex) {
          const dist = Math.abs(toneIndex - currentIndex);
          if (dist < minSteps) {
            minSteps = dist;
            targetIndex = toneIndex;
          }
        }
      }
    }

    // Move one step toward target
    if (targetIndex !== -1 && targetIndex !== currentIndex) {
      const step = targetIndex > currentIndex ? 1 : -1;
      const nextIndex = currentIndex + step;
      if (nextIndex >= 0 && nextIndex < scale.length) {
        return scale[nextIndex];
      }
    }

    return scale[currentIndex]; // Stay if no valid move
  }

  /**
   * Get chord tone in current melodic direction
   */
  selectDirectionalChordTone(
    fromNote: string,
    chordTones: string[],
    scale: string[]
  ): string {
    const fromIndex = this.findNoteInScale(fromNote, scale);
    if (fromIndex === -1) return chordTones[0] ?? fromNote;

    const candidates: string[] = [];
    for (const tone of chordTones) {
      const toneIndex = this.findNoteInScale(tone, scale);
      if (toneIndex === -1) continue;

      const step = toneIndex - fromIndex;
      const inDirection =
        (this.directionState.direction > 0 && step > 0 && step <= 5) ||
        (this.directionState.direction < 0 && step < 0 && step >= -5);
      
      if (inDirection) candidates.push(tone);
    }

    if (candidates.length > 0) {
      // Sort by distance (prefer smaller intervals)
      candidates.sort((a, b) => {
        const aIdx = this.findNoteInScale(a, scale);
        const bIdx = this.findNoteInScale(b, scale);
        return Math.abs(aIdx - fromIndex) - Math.abs(bIdx - fromIndex);
      });
      return candidates[0];
    }

    return this.selectSimpleChordTone(fromNote, chordTones, scale);
  }

  /**
   * Get approach note (single scale step in current direction)
   */
  selectApproachNote(currentIndex: number, scale: string[]): string {
    let nextIndex = currentIndex + this.directionState.direction;

    if (nextIndex >= 0 && nextIndex < scale.length) {
      return scale[nextIndex];
    }

    // At edge of range, reverse direction
    this.directionState.direction *= -1;
    nextIndex = currentIndex + this.directionState.direction;
    
    if (nextIndex >= 0 && nextIndex < scale.length) {
      return scale[nextIndex];
    }

    return scale[currentIndex];
  }

  /**
   * Get chromatic neighbor (dissonant note)
   */
  selectDissonantNote(fromNote: string): string {
    const direction = Math.random() < 0.5 ? 1 : -1;
    return transposeNote(fromNote, direction);
  }

  /**
   * Keep note within comfortable melodic range
   */
  constrainToRange(note: string): string {
    try {
      const semitones = getIntervalSemitones(this.config.minRange, note);
      if (semitones < 0) {
        return transposeNote(note, 12); // Transpose up
      }

      const rangeSemitones = getIntervalSemitones(
        this.config.minRange,
        this.config.maxRange
      );
      if (semitones > rangeSemitones) {
        return transposeNote(note, -12); // Transpose down
      }
    } catch {
      // Return unchanged if interval calculation fails
    }
    return note;
  }

  /**
   * Update direction tracking after note selection
   */
  updateDirectionTracking(
    currentIndex: number,
    newIndex: number,
    complexity: number
  ): void {
    if (newIndex === -1 || currentIndex === -1) return;

    const actualDirection = newIndex > currentIndex ? 1 : -1;
    
    if (actualDirection === this.directionState.direction) {
      this.directionState.stepsInDirection++;
    } else {
      this.directionState.direction = actualDirection as 1 | -1;
      this.directionState.stepsInDirection = 1;
    }

    // Check if we should change direction
    const maxSteps =
      this.config.maxStepsInDirection +
      Math.floor(complexity * this.config.directionChangeBase);
    
    if (
      this.directionState.stepsInDirection >= maxSteps &&
      Math.random() < this.config.directionChangeProbability
    ) {
      this.directionState.direction *= -1;
      this.directionState.stepsInDirection = 0;
    }
  }

  /**
   * Reverse direction (used at phrase boundaries)
   */
  reverseDirection(): void {
    this.directionState.direction *= -1;
    this.directionState.stepsInDirection = 0;
  }
}


