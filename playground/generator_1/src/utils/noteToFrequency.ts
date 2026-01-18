/**
 * Converts a note name (e.g., "A4", "C#3") to frequency in Hz
 * @param note - Note name in format "NoteNameOctave" (e.g., "A4", "C#3")
 * @returns Frequency in Hz
 * @throws Error if note format is invalid
 */
export function noteToFrequency(note: string): number {
  const noteNames = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];
  const match = note.match(/^([A-G]#?)(\d+)$/);
  if (!match) {
    throw new Error(`Invalid note format: ${note}`);
  }
  const [, noteName, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);
  const noteIndex = noteNames.indexOf(noteName);
  if (noteIndex === -1) {
    throw new Error(`Invalid note name: ${noteName}`);
  }
  // A4 = 440Hz, formula: f = 440 * 2^((n - 69) / 12) where n is MIDI note
  const midiNote = (octave + 1) * 12 + noteIndex;
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}


