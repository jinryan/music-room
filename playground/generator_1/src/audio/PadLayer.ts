import type { ChordProgressionManager } from "../music/ChordProgressionManager";
import { BaseAudioLayer, type AudioNodeRef } from "./BaseAudioLayer";
import { noteToFrequency } from "../utils/noteToFrequency";
import { stopAudioNodeGroup } from "../utils/audioNodes";

export class PadLayer extends BaseAudioLayer {
  private chordManager: ChordProgressionManager;
  private scheduledChords: Set<number> = new Set();
  private voiceStartTimes: Map<AudioNodeRef, number> = new Map();

  constructor(
    context: AudioContext,
    chordManager: ChordProgressionManager,
    tempo: number,
  ) {
    super(context, tempo, "PadLayer");
    this.chordManager = chordManager;
  }

  private createPadVoice(frequency: number): AudioNodeRef {
    const oscillator = this.context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    const gain = this.context.createGain();
    gain.gain.value = 0;

    oscillator.connect(gain);

    return { source: oscillator, gain };
  }

  private schedulePad(barIndex: number, scheduleTime: number): void {
    if (this.scheduledChords.has(barIndex)) {
      return;
    }
    this.scheduledChords.add(barIndex);

    const chord = this.chordManager.getChordForBar(barIndex);

    const duration = 4.0; // 4 seconds like a pad
    const volume = 0.2;

    // Only stop voices that would overlap with this new chord
    // A voice overlaps if it starts before this chord and would still be playing
    const newChordEndTime = scheduleTime + duration;
    const nodesToRemove: AudioNodeRef[] = [];
    
    for (const node of this.activeNodes) {
      const voiceStartTime = this.voiceStartTimes.get(node);
      if (voiceStartTime !== undefined) {
        const voiceEndTime = voiceStartTime + duration;
        // Stop if voice overlaps with new chord (starts before new chord ends, ends after new chord starts)
        if (voiceStartTime < newChordEndTime && voiceEndTime > scheduleTime) {
          try {
            stopAudioNodeGroup(node, this.context);
          } catch (e) {
            // Ignore errors
          }
          nodesToRemove.push(node);
          this.voiceStartTimes.delete(node);
        }
      }
    }
    
    // Remove stopped nodes from active set
    for (const node of nodesToRemove) {
      this.activeNodes.delete(node);
    }

    // Create a voice for each note in the chord
    for (const note of chord.notes) {
      // Transpose notes that are too low (below 200Hz) up one octave
      // This prevents low frequency corruption issues
      let adjustedNote = note;
      let frequency = noteToFrequency(note);
      
      // If frequency is below 200Hz, transpose up one octave
      if (frequency < 150) {
        const octaveMatch = note.match(/^([A-G]#?)(\d+)$/);
        if (octaveMatch) {
          const [, noteName, octaveStr] = octaveMatch;
          const octave = parseInt(octaveStr, 10);
          adjustedNote = noteName + (octave + 1);
          frequency = noteToFrequency(adjustedNote);
        }
      }
      
      const nodeGroup = this.createPadVoice(frequency);

      nodeGroup.gain.connect(this.context.destination);
      this.addActiveNode(nodeGroup);
      
      // Track when this voice starts so we can check for overlaps later
      this.voiceStartTimes.set(nodeGroup, scheduleTime);

      nodeGroup.source.start(scheduleTime);
      nodeGroup.source.stop(scheduleTime + duration);

      nodeGroup.gain.gain.setValueAtTime(0, scheduleTime);
      nodeGroup.gain.gain.linearRampToValueAtTime(
        volume,
        scheduleTime + 0.001,
      );

      const releaseStart = scheduleTime + duration - 0.5;
      nodeGroup.gain.gain.setValueAtTime(volume, releaseStart);
      nodeGroup.gain.gain.linearRampToValueAtTime(
        0,
        scheduleTime + duration,
      );
    }
  }

  schedulePattern(startTime: number, loopLength: number): void {
    const beatDuration = this.getBeatDuration();
    const chordChangeBeats = [0, 8, 16, 24]; // One per 2-bar chord

    for (let loop = 0; loop < loopLength; loop++) {
      for (const beatOffset of chordChangeBeats) {
        const absoluteBeat = loop * 32 + beatOffset;
        const barIndex = Math.floor(absoluteBeat / 4);
        const scheduleTime = startTime + absoluteBeat * beatDuration;
        this.schedulePad(barIndex, scheduleTime);
      }
    }
  }

  start(startTime: number): void {
    this.scheduledChords.clear();
    this.voiceStartTimes.clear();
    this.schedulePattern(startTime, 4);
  }
  
  stop(): void {
    this.voiceStartTimes.clear();
    super.stop();
  }
}
