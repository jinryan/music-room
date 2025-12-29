/**
 * Generates rhythmic patterns with varying complexity
 */
export class RhythmicPattern {
  private patterns = {
    simple: ['8n', '8n', '8n', '8n'],              // Even 8th notes
    syncopated: ['8n', '16n', '16n', '8n'],        // Syncopation
    swung: ['8n.', '16n', '8n', '8n'],             // Swing feel
    varied: ['4n', '8n', '16n', '16n', '8n'],      // Mixed durations
    triplet: ['8t', '8t', '8t']                    // Triplet feel
  };
  
  private currentPattern: keyof typeof this.patterns = 'simple';
  private patternIndex: number = 0;
  
  /**
   * Get next duration string based on variation amount
   * @param variationAmount - 0-1, where 0 = simple, 1 = complex
   * @returns Duration string (e.g., "8n", "16n", "8n.")
   */
  getNextDuration(variationAmount: number): string {
    // Select pattern based on variation amount
    if (variationAmount < 0.2) {
      this.currentPattern = 'simple';
    } else if (variationAmount < 0.5) {
      this.currentPattern = Math.random() < 0.7 ? 'simple' : 'syncopated';
    } else if (variationAmount < 0.8) {
      const options: (keyof typeof this.patterns)[] = ['syncopated', 'swung', 'varied'];
      this.currentPattern = options[Math.floor(Math.random() * options.length)];
    } else {
      const options: (keyof typeof this.patterns)[] = ['syncopated', 'swung', 'varied', 'triplet'];
      this.currentPattern = options[Math.floor(Math.random() * options.length)];
    }
    
    const pattern = this.patterns[this.currentPattern];
    const duration = pattern[this.patternIndex % pattern.length];
    this.patternIndex++;
    
    return duration;
  }
  
  /**
   * Parse duration string to seconds based on beat duration
   * "8n" = 0.5 beats, "16n" = 0.25 beats, "8n." = 0.75 beats, "4n" = 1 beat, "8t" = 0.33 beats
   * @param durationString - Duration string (e.g., "8n", "16n", "8n.")
   * @param beatDuration - Duration of one beat in seconds
   * @returns Duration in seconds
   */
  parseDuration(durationString: string, beatDuration: number): number {
    const match = durationString.match(/^(\d+)([nth])(\.?)$/);
    if (!match) return beatDuration * 0.5; // Default to 8th note
    
    const [, value, unit, dot] = match;
    const numValue = parseInt(value, 10);
    
    let beats: number;
    if (unit === 'n') {
      beats = 4 / numValue; // 4n = 1 beat, 8n = 0.5 beats, 16n = 0.25 beats
    } else if (unit === 't') {
      beats = (4 / numValue) * (2 / 3); // Triplet: 8t = 0.33 beats
    } else if (unit === 'h') {
      beats = numValue * 2; // Half note = 2 beats
    } else {
      beats = 1;
    }
    
    if (dot === '.') {
      beats *= 1.5; // Dotted note
    }
    
    return beats * beatDuration;
  }
  
  /**
   * Reset pattern index (useful when restarting)
   */
  reset(): void {
    this.patternIndex = 0;
  }
}

