import type { ChordProgressionManager } from "../music/ChordProgressionManager";
import { noteToFrequency } from "../utils/noteToFrequency";
import { BaseAudioLayer, type AudioNodeRef } from "./BaseAudioLayer";
import { applyEnvelope } from "../utils/audioNodes";

export class BassLayer extends BaseAudioLayer {
  private chordManager: ChordProgressionManager;
  private scheduledNotes: Set<number> = new Set();

  constructor(
    context: AudioContext,
    chordManager: ChordProgressionManager,
    tempo: number,
  ) {
    super(context, tempo, "BassLayer");
    this.chordManager = chordManager;
  }

  private createBassSynth(): AudioNodeRef {
    const oscillator = this.context.createOscillator();
    oscillator.type = "sawtooth";

    const filter = this.context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 200;
    filter.Q.value = 2;

    const gain = this.context.createGain();
    gain.gain.value = 0;

    oscillator.connect(filter);
    filter.connect(gain);

    return { source: oscillator, gain, filter };
  }

  scheduleNote(beatIndex: number, scheduleTime: number): void {
    if (this.scheduledNotes.has(beatIndex)) {
      return;
    }
    this.scheduledNotes.add(beatIndex);

    const barIndex = Math.floor(beatIndex / 4);
    const chord = this.chordManager.getChordForBar(barIndex);
    const rootNote = chord.root + "2";
    const frequency = noteToFrequency(rootNote);

    const nodeGroup = this.createBassSynth();
    nodeGroup.gain.connect(this.context.destination);
    this.addActiveNode(nodeGroup);

    const beatDuration = this.getBeatDuration();
    const noteDuration = beatDuration * 2; // Half note (2 beats)

    const oscillator = nodeGroup.source as OscillatorNode;
    oscillator.frequency.value = frequency;
    nodeGroup.source.start(scheduleTime);
    nodeGroup.source.stop(scheduleTime + noteDuration);

    applyEnvelope(nodeGroup.gain, scheduleTime, noteDuration, {
      attack: 0.01,
      decay: 0.2,
      sustain: 0.3,
      release: 0.5,
      volume: 0.4,
    });
  }

  schedulePattern(startTime: number, loopLength: number): void {
    const beatDuration = this.getBeatDuration();
    // Pattern: root on beats 1 and 3 (0-indexed: 0, 2, 8, 10, 16, 18, 24, 26)
    const patternBeats = [0, 2, 8, 10, 16, 18, 24, 26];

    for (let loop = 0; loop < loopLength; loop++) {
      for (const beatOffset of patternBeats) {
        const absoluteBeat = loop * 32 + beatOffset;
        const scheduleTime = startTime + absoluteBeat * beatDuration;
        this.scheduleNote(absoluteBeat, scheduleTime);
      }
    }
  }

  start(startTime: number): void {
    this.scheduledNotes.clear();
    this.schedulePattern(startTime, 4);
  }
}

