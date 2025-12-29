import type { Chord } from "./config";

export class ChordProgressionManager {
  private progression: Chord[];
  private barsPerChord: number;
  private currentChordIndex: number = 0;
  private barCounter: number = 0;

  constructor(progression: Chord[], barsPerChord: number) {
    this.progression = progression;
    this.barsPerChord = barsPerChord;
  }

  getCurrentChord(): Chord {
    return this.progression[this.currentChordIndex];
  }

  advance(): void {
    // Called every bar
    this.barCounter++;
    if (this.barCounter >= this.barsPerChord) {
      this.barCounter = 0;
      this.currentChordIndex =
        (this.currentChordIndex + 1) % this.progression.length;
    }
  }

  getChordTones(octave: number = 3): string[] {
    // Returns notes from current chord for melody generation
    const chord = this.getCurrentChord();
    return chord.notes.map((note) => {
      const noteName = note.replace(/[0-9]/g, "");
      return noteName + octave;
    });
  }

  getChordForBar(barIndex: number): Chord {
    // Calculate which chord should be active at a given bar index
    // Each chord lasts barsPerChord bars
    // Handle negative indices by normalizing first
    const normalizedBar = barIndex < 0 
      ? (this.progression.length * this.barsPerChord) + (barIndex % (this.progression.length * this.barsPerChord))
      : barIndex;
    const chordIndex = Math.floor(normalizedBar / this.barsPerChord) % this.progression.length;
    return this.progression[chordIndex];
  }

  getChordTonesForBar(barIndex: number, octave: number = 3): string[] {
    // Returns notes from chord at given bar index for melody generation
    const chord = this.getChordForBar(barIndex);
    return chord.notes.map((note) => {
      const noteName = note.replace(/[0-9]/g, "");
      return noteName + octave;
    });
  }

  reset(): void {
    this.currentChordIndex = 0;
    this.barCounter = 0;
  }
}

