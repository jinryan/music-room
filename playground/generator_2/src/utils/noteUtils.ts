/**
 * Utility functions for note manipulation using Tonal.js
 */
import { Scale, Note, Interval } from 'tonal';

/**
 * Get the chromatic index of a note name (C=0, C#/Db=1, D=2, etc.)
 */
function getNoteChromatic(noteName: string): number {
  const noteOrder: Record<string, number> = {
    'C': 0, 'C#': 1, 'Db': 1,
    'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'Fb': 4, 'E#': 5,
    'F': 5, 'F#': 6, 'Gb': 6,
    'G': 7, 'G#': 8, 'Ab': 8,
    'A': 9, 'A#': 10, 'Bb': 10,
    'B': 11, 'Cb': 11, 'B#': 0
  };
  return noteOrder[noteName] ?? 0;
}

/**
 * Get full scale notes with CORRECT octave numbers
 * Octaves increment when we cross from B to C (or lower to higher pitch)
 * @param key - The key (e.g., "A", "C")
 * @param scaleType - The scale type (e.g., "minor", "major")
 * @param octave - The starting octave for the root note (e.g., 4)
 * @returns Array of note names with correct octaves (e.g., ["A4", "B4", "C5", "D5", ...])
 */
export function getFullScale(key: string, scaleType: string, octave: number): string[] {
  const scaleName = `${key} ${scaleType}`; // e.g., "A minor"
  const scaleNotes = Scale.get(scaleName).notes; // ["A", "B", "C", "D", "E", "F", "G"]
  if (!scaleNotes || scaleNotes.length === 0) {
    return [];
  }
  
  // Get the chromatic position of the root note
  const rootChromatic = getNoteChromatic(scaleNotes[0]);
  let currentOctave = octave;
  let previousChromatic = rootChromatic;
  
  return scaleNotes.map((note, index) => {
    const noteChromatic = getNoteChromatic(note);
    
    // If this note's chromatic position is lower than the previous note,
    // we've wrapped around (e.g., from B to C), so increment the octave
    if (index > 0 && noteChromatic < previousChromatic) {
      currentOctave++;
    }
    
    previousChromatic = noteChromatic;
    return note + currentOctave;
  });
}

/**
 * Normalize a note to a standard format (handles double sharps/flats, enharmonic equivalents)
 * @param note - Note name with octave (e.g., "C##5", "Bbb4")
 * @returns Normalized note (e.g., "D5", "A4")
 */
export function normalizeNote(note: string): string {
  try {
    const normalized = Note.simplify(note);
    if (normalized && normalized !== '') {
      return normalized;
    }
  } catch (e) {
    // If Tonal.js fails, try to handle double sharps/flats manually
  }
  
  // Handle double sharps/flats manually as fallback
  // C## = D, D## = E, E## = F#, F## = G, G## = A, A## = B, B## = C#
  const doubleSharpMap: Record<string, string> = {
    'C##': 'D',
    'D##': 'E',
    'E##': 'F#',
    'F##': 'G',
    'G##': 'A',
    'A##': 'B',
    'B##': 'C#',
  };
  
  // Handle double flats: Cbb = Bb, Dbb = C, Ebb = Db, Fbb = Eb, Gbb = F, Abb = Gb, Bbb = A
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
      // Handle octave adjustment for B## (B##4 = C#5)
      if (noteName === 'B##') {
        return doubleSharpMap[noteName] + (octave + 1);
      }
      return doubleSharpMap[noteName] + octave;
    }
  }
  
  const doubleFlatMatch = note.match(/^([A-G]bb)(\d+)$/);
  if (doubleFlatMatch) {
    const [, noteName, octaveStr] = doubleFlatMatch;
    const octave = parseInt(octaveStr, 10);
    if (doubleFlatMap[noteName]) {
      // Handle octave adjustment for Cbb (Cbb4 = Bb3)
      if (noteName === 'Cbb') {
        return doubleFlatMap[noteName] + (octave - 1);
      }
      return doubleFlatMap[noteName] + octave;
    }
  }
  
  return note; // Return as-is if we can't normalize
}

/**
 * Transpose a note by semitones and normalize the result
 * @param note - Note name with octave (e.g., "A4")
 * @param semitones - Number of semitones to transpose (positive = up, negative = down)
 * @returns Normalized transposed note (e.g., "B4" for semitones=2)
 */
export function transposeNote(note: string, semitones: number): string {
  const transposed = Note.transpose(note, Interval.fromSemitones(semitones));
  return normalizeNote(transposed);
}

/**
 * Get interval distance between two notes in semitones
 * @param fromNote - Starting note (e.g., "A4")
 * @param toNote - Target note (e.g., "C4")
 * @returns Number of semitones between notes (absolute value)
 */
export function getIntervalSemitones(fromNote: string, toNote: string): number {
  const interval = Interval.distance(fromNote, toNote);
  const semitones = Interval.semitones(interval);
  // Return absolute value to find nearest note regardless of direction
  return Math.abs(semitones ?? 0);
}

/**
 * Find the nearest chord tone to a given note
 * @param fromNote - Starting note (e.g., "A4")
 * @param chordTones - Array of chord tone notes (e.g., ["A4", "C4", "E4"])
 * @param scale - Full scale array (for fallback, not currently used)
 * @returns The chord tone closest to fromNote
 */
export function findNearestChordTone(
  fromNote: string, 
  chordTones: string[], 
  scale: string[]
): string {
  if (chordTones.length === 0) {
    return fromNote; // Fallback
  }
  
  let minDistance = Infinity;
  let nearest = chordTones[0];
  
  for (const chordTone of chordTones) {
    const distance = Math.abs(getIntervalSemitones(fromNote, chordTone));
    if (distance < minDistance && distance > 0) {
      minDistance = distance;
      nearest = chordTone;
    }
  }
  
  return nearest;
}

/**
 * Get note index in scale array
 * @param note - Note name with octave (e.g., "A4")
 * @param scale - Array of scale notes with octaves (e.g., ["A4", "B4", "C4", ...])
 * @returns Index of note in scale, or -1 if not found
 */
export function getNoteIndexInScale(note: string, scale: string[]): number {
  const noteName = note.replace(/\d+$/, ''); // Remove octave
  return scale.findIndex(n => {
    const scaleNoteName = n.replace(/\d+$/, '');
    return scaleNoteName === noteName;
  });
}

