/**
 * GenerativeMelody - Generates melodic lines with configurable complexity
 *
 * This class orchestrates melody generation by combining:
 * - NoteSelector: Musical decision-making (which note to play)
 * - MelodySynth: Sound synthesis (how the note sounds)
 * - PhraseStructure: Phrase tracking and resolution
 * - RhythmicPattern: Note duration patterns
 * - MotifMemory: Melodic motif development
 */

import type { ChordProgressionManager } from "../music/ChordProgressionManager";
import { noteToFrequency } from "../utils/noteToFrequency";
import { BaseAudioLayer, type AudioNodeRef } from "./BaseAudioLayer";
import { findNearestChordTone, normalizeNote } from "../utils/noteUtils";
import { warn, log } from "../utils/logger";
import { RhythmicPattern } from "./RhythmicPattern";
import { PhraseStructure } from "./PhraseStructure";
import { MotifMemory } from "./MotifMemory";
import { MelodySynth } from "./MelodySynth";
import { NoteSelector } from "./NoteSelector";
import {
  DEFAULT_MELODY_CONFIG,
  calculateComplexityParams,
  type MelodyConfig,
} from "./melodyConfig";

/** Complexity-derived parameters */
interface ComplexityParams {
  passingToneProbability: number;
  rhythmicVariation: number;
  phraseAwareness: number;
  dissonanceTolerance: number;
  restProbability: number;
}

export class GenerativeMelody extends BaseAudioLayer {
  // Dependencies
  private readonly chordManager: ChordProgressionManager;
  private readonly config: MelodyConfig;

  // Sub-systems
  private readonly synth: MelodySynth;
  private readonly noteSelector: NoteSelector;
  private readonly phrase: PhraseStructure;
  private readonly rhythmGenerator: RhythmicPattern;
  private readonly motifMemory: MotifMemory;

  // State
  private complexity: number;
  private complexityParams: ComplexityParams;
  private lastNote: string | null = null;
  private recentNotes: string[] = [];
  private needsResolution: boolean = false;
  private scheduledNotes: Set<number> = new Set();
  private beatCounter: number = 0;

  constructor(
    context: AudioContext,
    chordManager: ChordProgressionManager,
    tempo: number,
    config: MelodyConfig = DEFAULT_MELODY_CONFIG
  ) {
    super(context, tempo, "GenerativeMelody");

    this.chordManager = chordManager;
    this.config = config;

    // Initialize sub-systems
    this.synth = new MelodySynth(context, config.synth, config.envelope);
    this.synth.setupDelay(this.getBeatDuration(), config.delay);

    this.noteSelector = new NoteSelector(config.melodic);
    this.phrase = new PhraseStructure(config.barsPerPhrase);
    this.rhythmGenerator = new RhythmicPattern();
    this.motifMemory = new MotifMemory();

    // Initialize complexity
    this.complexity = config.initialComplexity;
    this.complexityParams = calculateComplexityParams(
      this.complexity,
      config.complexity
    );
  }

  /**
   * Set melodic complexity (0-1)
   * Controls all sub-parameters: passing tones, rhythm, phrase awareness, dissonance
   */
  setComplexity(value: number): void {
    this.complexity = Math.max(0, Math.min(1, value));
    this.complexityParams = calculateComplexityParams(
      this.complexity,
      this.config.complexity
    );

    log(
      "GenerativeMelody",
      `setComplexity(${value.toFixed(2)}) -> ` +
        `passingTone=${this.complexityParams.passingToneProbability.toFixed(2)}, ` +
        `phraseAware=${this.complexityParams.phraseAwareness.toFixed(2)}, ` +
        `dissonance=${this.complexityParams.dissonanceTolerance.toFixed(2)}, ` +
        `restProb=${this.complexityParams.restProbability.toFixed(2)}`
    );
  }

  /**
   * Set rest probability directly
   */
  setRestProbability(probability: number): void {
    this.complexityParams.restProbability = Math.max(0, Math.min(1, probability));
  }

  /**
   * Get the next note based on current musical context
   */
  private getNextNote(barIndex: number): string | null {
    const scale = this.noteSelector.getExtendedScale();
    const chordTones = this.noteSelector.getExtendedChordTones(
      (bar, octave) => this.chordManager.getChordTonesForBar(bar, octave),
      barIndex
    );

    // Calculate beat info
    const isStrongBeat = this.beatCounter % 4 === 0;
    this.beatCounter = (this.beatCounter + 1) % 8;

    log(
      "GenerativeMelody",
      `getNextNote: bar=${barIndex}, beat=${this.beatCounter}, strong=${isStrongBeat}, ` +
        `complexity=${this.complexity.toFixed(2)}, dir=${this.noteSelector.getDirection()}, ` +
        `lastNote=${this.lastNote ?? "null"}`
    );

    // Check for rest
    if (this.noteSelector.shouldRest(this.complexityParams.restProbability, isStrongBeat)) {
      this.phrase.advance();
      return null;
    }

    // Handle first note
    if (!this.lastNote) {
      const note = this.noteSelector.selectStartingNote(chordTones);
      this.phrase.advance();
      log("GenerativeMelody", `Starting on: ${note}`);
      return note;
    }

    // Find current position in scale
    const currentIndex = this.noteSelector.findNoteInScale(this.lastNote, scale);
    if (currentIndex === -1) {
      const note = findNearestChordTone(this.lastNote, chordTones, scale);
      this.phrase.advance();
      return note;
    }

    // Check for phrase resolution
    if (this.phrase.shouldResolve() && this.complexity >= 0.3) {
      const chord = this.chordManager.getChordForBar(barIndex);
      const rootNote = chord.root + "4";
      this.phrase.advance();
      this.noteSelector.reverseDirection();
      log("GenerativeMelody", `Phrase resolution to: ${rootNote}`);
      return rootNote;
    }

    // Select note based on complexity tier
    const { note, source } = this.selectNoteByComplexity(
      currentIndex,
      scale,
      chordTones,
      isStrongBeat,
      barIndex
    );

    // Update direction tracking
    const newIndex = this.noteSelector.findNoteInScale(note, scale);
    this.noteSelector.updateDirectionTracking(currentIndex, newIndex, this.complexity);

    // Constrain to range
    const constrainedNote = this.noteSelector.constrainToRange(note);

    log(
      "GenerativeMelody",
      `Selected: ${constrainedNote} (source: ${source}, dir: ${this.noteSelector.getDirection()})`
    );
    this.phrase.advance();
    return constrainedNote;
  }

  /**
   * Select note based on complexity tier
   */
  private selectNoteByComplexity(
    currentIndex: number,
    scale: string[],
    chordTones: string[],
    isStrongBeat: boolean,
    _barIndex: number
  ): { note: string; source: string } {
    const { dissonanceTolerance } = this.complexityParams;

    // Tier 1: Very Simple (0-0.1) - Only chord tones
    if (this.complexity <= 0.1) {
      return {
        note: this.noteSelector.selectSimpleChordTone(this.lastNote!, chordTones, scale),
        source: "simple-chord",
      };
    }

    // Tier 2: Simple (0.1-0.3) - Chord tones on strong beats, scale steps on weak
    if (this.complexity <= 0.3) {
      if (isStrongBeat) {
        return {
          note: this.noteSelector.selectSimpleChordTone(this.lastNote!, chordTones, scale),
          source: "chord-strong",
        };
      }
      return {
        note: this.noteSelector.selectScaleStepTowardChordTone(currentIndex, scale, chordTones),
        source: "scale-step",
      };
    }

    // Tier 3: Moderate (0.3-0.5) - Directional chord tones, approach notes
    if (this.complexity <= 0.5) {
      if (isStrongBeat) {
        return {
          note: this.noteSelector.selectDirectionalChordTone(this.lastNote!, chordTones, scale),
          source: "directional-chord",
        };
      }
      return {
        note: this.noteSelector.selectApproachNote(currentIndex, scale),
        source: "approach",
      };
    }

    // Tier 4: Complex (0.5-0.7) - Add motif repetition
    if (this.complexity <= 0.7) {
      if (this.motifMemory.shouldRepeatMotif(this.complexity)) {
        const motif = this.motifMemory.getVariedMotif();
        if (motif?.length) {
          log("GenerativeMelody", `Using motif note: ${motif[0]}`);
          return { note: motif[0], source: "motif" };
        }
      }
      return this.selectElaborateNote(currentIndex, scale, chordTones, isStrongBeat);
    }

    // Tier 5: Very Complex (0.7-1.0) - Add dissonance
    if (Math.random() < dissonanceTolerance && !isStrongBeat && this.lastNote) {
      this.needsResolution = true;
      const note = this.noteSelector.selectDissonantNote(this.lastNote);
      log("GenerativeMelody", `Dissonant note: ${note}`);
      return { note, source: "dissonant" };
    }

    if (this.needsResolution && isStrongBeat) {
      this.needsResolution = false;
      return {
        note: findNearestChordTone(this.lastNote!, chordTones, scale),
        source: "resolution",
      };
    }

    return this.selectElaborateNote(currentIndex, scale, chordTones, isStrongBeat);
  }

  /**
   * Select elaborate note for higher complexity tiers
   */
  private selectElaborateNote(
    currentIndex: number,
    scale: string[],
    chordTones: string[],
    isStrongBeat: boolean
  ): { note: string; source: string } {
    if (isStrongBeat) {
      return {
        note: this.noteSelector.selectScaleStepTowardChordTone(currentIndex, scale, chordTones),
        source: "elaborate-strong",
      };
    }
    return {
      note: this.noteSelector.selectApproachNote(currentIndex, scale),
      source: "elaborate-weak",
    };
  }

  /**
   * Schedule a single note
   */
  scheduleNote(eighthNoteIndex: number, scheduleTime: number): void {
    if (this.scheduledNotes.has(eighthNoteIndex)) return;
    this.scheduledNotes.add(eighthNoteIndex);

    const barIndex = Math.floor(eighthNoteIndex / 8);
    let note = this.getNextNote(barIndex);

    if (!note) return; // Rest

    // Normalize and validate note
    note = this.validateAndNormalizeNote(note, barIndex);
    if (!note) return;

    // Convert to frequency
    let frequency: number;
    try {
      frequency = noteToFrequency(note);
    } catch {
      warn("GenerativeMelody", `Failed to convert note: ${note}`);
      return;
    }

    // Create synth voice and schedule
    const nodeGroup = this.synth.createVoice(frequency);
    this.addActiveNode(nodeGroup as unknown as AudioNodeRef);

    const durationString = this.rhythmGenerator.getNextDuration(
      this.complexityParams.rhythmicVariation
    );
    const noteDuration = this.rhythmGenerator.parseDuration(
      durationString,
      this.getBeatDuration()
    );

    this.synth.scheduleNote(nodeGroup, scheduleTime, noteDuration, this.config.noteOverlapMs);

    // Update state
    this.lastNote = note;
    this.updateMotifMemory(note);
  }

  /**
   * Validate and normalize a note, with fallback to chord tone
   */
  private validateAndNormalizeNote(note: string, barIndex: number): string | null {
    try {
      note = normalizeNote(note);
    } catch {
      warn("GenerativeMelody", `Failed to normalize: ${note}`);
    }

    if (!note.match(/^[A-G][b#]?\d+$/)) {
      warn("GenerativeMelody", `Invalid note format: ${note}`);
      const chordTones = this.chordManager.getChordTonesForBar(barIndex, 4);
      return chordTones[0] ?? null;
    }

    return note;
  }

  /**
   * Update motif memory with recent note
   */
  private updateMotifMemory(note: string): void {
    this.recentNotes.push(note);
    if (this.recentNotes.length > 8) {
      this.recentNotes.shift();
    }
    this.motifMemory.recordMotif(this.recentNotes);
  }

  /**
   * Schedule a pattern of notes
   */
  schedulePattern(startTime: number, loopLength: number): void {
    const beatDuration = this.getBeatDuration();
    const eighthNotesPerLoop = 64; // 32 beats * 2

    for (let loop = 0; loop < loopLength; loop++) {
      for (let eighth = 0; eighth < eighthNotesPerLoop; eighth++) {
        const absoluteEighth = loop * eighthNotesPerLoop + eighth;
        const loopBeat = loop * 32 + eighth / 2;
        const scheduleTime = startTime + loopBeat * beatDuration;
        this.scheduleNote(absoluteEighth, scheduleTime);
      }
    }
  }

  /**
   * Start melody generation
   */
  start(startTime: number): void {
    this.resetState();
    this.schedulePattern(startTime, 4);
  }

  /**
   * Stop melody generation
   */
  stop(): void {
    this.resetState();
    super.stop();
  }

  /**
   * Reset all internal state
   */
  private resetState(): void {
    this.scheduledNotes.clear();
    this.lastNote = null;
    this.recentNotes = [];
    this.needsResolution = false;
    this.beatCounter = 0;
    this.phrase.reset();
    this.rhythmGenerator.reset();
    this.motifMemory.clear();
    this.noteSelector.reset();
  }
}
