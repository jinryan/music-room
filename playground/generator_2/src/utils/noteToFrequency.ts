/**
 * Converts a note name (e.g., "A4", "C#3", "Bb4") to frequency in Hz
 * Uses Tonal.js to normalize enharmonic equivalents
 * @param note - Note name in format "NoteNameOctave" (e.g., "A4", "C#3", "Bb4")
 * @returns Frequency in Hz
 * @throws Error if note format is invalid
 */
export function noteToFrequency(note: string): number {
  // Normalize the note first (handles double sharps/flats, enharmonic equivalents)
  // Import dynamically to avoid circular dependency
  try {
    const { Note } = require('tonal');
    const normalized = Note.simplify(note);
    if (normalized && normalized !== '') {
      note = normalized;
    }
  } catch (e) {
    // If normalization fails, continue with original note
  }
  
  // Handle double sharps/flats manually as fallback
  const doubleSharpMap: Record<string, string> = {
    'C##': 'D',
    'D##': 'E',
    'E##': 'F#',
    'F##': 'G',
    'G##': 'A',
    'A##': 'B',
    'B##': 'C#',
  };
  
  const doubleFlatMap: Record<string, string> = {
    'Cbb': 'Bb',
    'Dbb': 'C',
    'Ebb': 'Db',
    'Fbb': 'Eb',
    'Gbb': 'F',
    'Abb': 'Gb',
    'Bbb': 'A',
  };
  
  const doubleSharpMatch = note.match(/^([A-G]##)(\d+)$/);
  if (doubleSharpMatch) {
    const [, noteName, octaveStr] = doubleSharpMatch;
    const octave = parseInt(octaveStr, 10);
    if (doubleSharpMap[noteName]) {
      if (noteName === 'B##') {
        note = doubleSharpMap[noteName] + (octave + 1);
      } else {
        note = doubleSharpMap[noteName] + octave;
      }
    }
  }
  
  const doubleFlatMatch = note.match(/^([A-G]bb)(\d+)$/);
  if (doubleFlatMatch) {
    const [, noteName, octaveStr] = doubleFlatMatch;
    const octave = parseInt(octaveStr, 10);
    if (doubleFlatMap[noteName]) {
      if (noteName === 'Cbb') {
        note = doubleFlatMap[noteName] + (octave - 1);
      } else {
        note = doubleFlatMap[noteName] + octave;
      }
    }
  }
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
  
  // Handle both sharps (#) and flats (b)
  // Convert flats to sharps for processing
  let normalizedNote = note;
  const flatToSharp: Record<string, string> = {
    "Cb": "B",   // Cb = B (one semitone down)
    "Db": "C#",
    "Eb": "D#",
    "Fb": "E",   // Fb = E (one semitone down)
    "Gb": "F#",
    "Ab": "G#",
    "Bb": "A#",
  };
  
  // Check if note has a flat
  const flatMatch = note.match(/^([A-G])(b)(\d+)$/);
  if (flatMatch) {
    const [, noteName, , octaveStr] = flatMatch;
    const flatNote = noteName + "b";
    if (flatToSharp[flatNote]) {
      const sharpNote = flatToSharp[flatNote];
      // Handle octave adjustment for Cb and Fb
      let octave = parseInt(octaveStr, 10);
      if (flatNote === "Cb") {
        octave = octave - 1; // Cb4 = B3
      } else if (flatNote === "Fb") {
        octave = octave - 1; // Fb4 = E4 (same octave actually, but let's be safe)
      }
      normalizedNote = sharpNote + octave;
    }
  }
  
  const match = normalizedNote.match(/^([A-G]#?)(\d+)$/);
  if (!match) {
    throw new Error(`Invalid note format: ${note}`);
  }
  let [, noteName, octaveStr] = match;
  let octave = parseInt(octaveStr, 10);
  
  // Handle invalid enharmonic equivalents: E# = F, B# = C
  if (noteName === "E#") {
    noteName = "F";
    // E#4 = F4 (same octave)
  } else if (noteName === "B#") {
    noteName = "C";
    octave = octave + 1; // B#4 = C5
  }
  
  const noteIndex = noteNames.indexOf(noteName);
  if (noteIndex === -1) {
    throw new Error(`Invalid note name: ${noteName}`);
  }
  // A4 = 440Hz, formula: f = 440 * 2^((n - 69) / 12) where n is MIDI note
  const midiNote = (octave + 1) * 12 + noteIndex;
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

