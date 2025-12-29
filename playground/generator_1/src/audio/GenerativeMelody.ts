import type { ChordProgressionManager } from "../music/ChordProgressionManager";
import { noteToFrequency } from "../utils/noteToFrequency";
import { BaseAudioLayer, type AudioNodeRef } from "./BaseAudioLayer";
import { applyEnvelope } from "../utils/audioNodes";

export class GenerativeMelody extends BaseAudioLayer {
  private chordManager: ChordProgressionManager;
  private lastNote: string | null = null;
  private restProbability: number = 0.4; // 40% chance of rest
  private delay!: DelayNode;
  private delayGain!: GainNode;
  private feedbackGain!: GainNode;
  private scheduledNotes: Set<number> = new Set();

  constructor(
    context: AudioContext,
    chordManager: ChordProgressionManager,
    tempo: number,
  ) {
    super(context, tempo, "GenerativeMelody");
    this.chordManager = chordManager;
    this.setupDelay();
  }

  private setupDelay(): void {
    const beatDuration = this.getBeatDuration();
    const delayTime = beatDuration * 0.5; // 8th note delay

    this.delay = this.context.createDelay(1.0);
    this.delay.delayTime.value = delayTime;

    this.feedbackGain = this.context.createGain();
    this.feedbackGain.gain.value = 0.3;

    this.delayGain = this.context.createGain();
    this.delayGain.gain.value = 0.4;

    this.delay.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delay);
    this.delay.connect(this.delayGain);
    this.delayGain.connect(this.context.destination);
  }

  private getNextNote(barIndex: number): string | null {
    // 40% chance of rest
    if (Math.random() < this.restProbability) {
      return null;
    }

    const chordTones = this.chordManager.getChordTonesForBar(barIndex, 4); // Melody octave

    // If no previous note, pick randomly
    if (!this.lastNote) {
      return chordTones[Math.floor(Math.random() * chordTones.length)];
    }

    // Prefer stepwise motion (simple Markov-like behavior)
    // 70% chance to stay on same note or move to adjacent chord tone
    if (Math.random() < 0.7) {
      const currentIndex = chordTones.indexOf(this.lastNote);
      if (currentIndex !== -1) {
        const choices = [
          chordTones[currentIndex], // Stay
          chordTones[(currentIndex + 1) % chordTones.length], // Up
          chordTones[
            (currentIndex - 1 + chordTones.length) % chordTones.length
          ], // Down
        ];
        return choices[Math.floor(Math.random() * choices.length)];
      }
    }

    // 30% chance for any chord tone (jump)
    return chordTones[Math.floor(Math.random() * chordTones.length)];
  }

  private createMelodySynth(frequency: number): AudioNodeRef {
    const oscillator = this.context.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.value = frequency;

    const gain = this.context.createGain();
    gain.gain.value = 0;

    oscillator.connect(gain);
    gain.connect(this.context.destination);
    gain.connect(this.delay); // Send to delay

    return { source: oscillator, gain };
  }

  scheduleNote(eighthNoteIndex: number, scheduleTime: number): void {
    if (this.scheduledNotes.has(eighthNoteIndex)) {
      return;
    }
    this.scheduledNotes.add(eighthNoteIndex);

    // Calculate which bar this eighth note belongs to
    // 8 eighth notes per bar (4 beats * 2)
    const barIndex = Math.floor(eighthNoteIndex / 8);
    const note = this.getNextNote(barIndex);
    if (!note) {
      // Rest - do nothing
      return;
    }

    const frequency = noteToFrequency(note);
    const nodeGroup = this.createMelodySynth(frequency);
    this.addActiveNode(nodeGroup);

    const beatDuration = this.getBeatDuration();
    const noteDuration = beatDuration * 0.5; // 8th note

    nodeGroup.source.start(scheduleTime);
    nodeGroup.source.stop(scheduleTime + noteDuration);

    // Smooth envelope for short notes
    const releaseTime = Math.min(0.15, noteDuration * 0.6);
    applyEnvelope(nodeGroup.gain, scheduleTime, noteDuration, {
      attack: 0.01,
      decay: 0.05,
      sustain: 0.5,
      release: releaseTime,
      volume: 0.3,
    });

    this.lastNote = note;
  }

  schedulePattern(startTime: number, loopLength: number): void {
    const beatDuration = this.getBeatDuration();
    // Trigger on 8th notes (but many will be rests)
    // Each beat has 2 eighth notes, so 32 beats = 64 eighth notes
    const eighthNotesPerLoop = 64;

    for (let loop = 0; loop < loopLength; loop++) {
      for (let eighthNote = 0; eighthNote < eighthNotesPerLoop; eighthNote++) {
        const absoluteEighthNote = loop * eighthNotesPerLoop + eighthNote;
        const absoluteBeat = eighthNote / 2; // Convert to quarter note beats
        const loopBeat = loop * 32 + absoluteBeat;
        const scheduleTime = startTime + loopBeat * beatDuration;
        this.scheduleNote(absoluteEighthNote, scheduleTime);
      }
    }
  }

  start(startTime: number): void {
    this.scheduledNotes.clear();
    this.lastNote = null;
    this.schedulePattern(startTime, 4);
  }

  stop(): void {
    this.scheduledNotes.clear();
    this.lastNote = null;
    super.stop();
  }

  setRestProbability(probability: number): void {
    this.restProbability = Math.max(0, Math.min(1, probability));
  }
}

