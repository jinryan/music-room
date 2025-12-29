/**
 * Stores and varies short melodic motifs
 */
import { Note, Interval } from 'tonal';

export class MotifMemory {
  private motifs: string[][] = [];
  private maxMotifs: number = 3;
  private repeatProbability: number = 0.3;
  
  /**
   * Record recent notes as a motif
   * @param notes - Array of recent notes (last 3-4 notes)
   */
  recordMotif(notes: string[]): void {
    // Store last 3-4 notes as a motif
    if (notes.length >= 3) {
      this.motifs.push(notes.slice(-4));
      if (this.motifs.length > this.maxMotifs) {
        this.motifs.shift(); // Keep only recent motifs
      }
    }
  }
  
  /**
   * Check if we should repeat a motif
   * @param complexityLevel - 0-1, higher = more likely to repeat
   * @returns True if we should repeat a motif
   */
  shouldRepeatMotif(complexityLevel: number): boolean {
    // Higher complexity = more likely to develop motifs
    const adjustedProbability = this.repeatProbability * (0.5 + complexityLevel * 0.5);
    return this.motifs.length > 0 && Math.random() < adjustedProbability;
  }
  
  /**
   * Get a varied version of a stored motif
   * @returns Varied motif (transposed or retrograde) or null if no motifs
   */
  getVariedMotif(): string[] | null {
    if (this.motifs.length === 0) return null;
    
    // Pick a random motif
    const motif = this.motifs[Math.floor(Math.random() * this.motifs.length)];
    
    // Vary it (transpose, invert, retrograde)
    const variationType = Math.floor(Math.random() * 3);
    
    switch (variationType) {
      case 0: return this.transpose(motif, 2); // Up a step
      case 1: return this.transpose(motif, -2); // Down a step
      case 2: return this.retrograde(motif); // Backwards
      default: return motif;
    }
  }
  
  /**
   * Transpose a motif by semitones
   * @param motif - Array of notes
   * @param semitones - Number of semitones to transpose
   * @returns Transposed motif
   */
  private transpose(motif: string[], semitones: number): string[] {
    // Use Tonal.js for transposition
    return motif.map(note => Note.transpose(note, Interval.fromSemitones(semitones)));
  }
  
  /**
   * Reverse the order of notes in a motif
   * @param motif - Array of notes
   * @returns Reversed motif
   */
  private retrograde(motif: string[]): string[] {
    return [...motif].reverse();
  }
  
  /**
   * Clear all stored motifs
   */
  clear(): void {
    this.motifs = [];
  }
  
  /**
   * Get number of stored motifs
   */
  getMotifCount(): number {
    return this.motifs.length;
  }
}

