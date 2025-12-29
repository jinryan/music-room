/**
 * Tracks position within musical phrases and provides phrase-aware decisions
 */
export class PhraseStructure {
  private barsPerPhrase: number;
  private beatsPerBar: number;
  private totalBeats: number;
  private currentBeat: number = 0;
  
  constructor(barsPerPhrase: number = 4, beatsPerBar: number = 4) {
    this.barsPerPhrase = barsPerPhrase;
    this.beatsPerBar = beatsPerBar;
    this.totalBeats = barsPerPhrase * beatsPerBar;
  }
  
  /**
   * Advance to next beat in phrase
   */
  advance(): void {
    this.currentBeat = (this.currentBeat + 1) % this.totalBeats;
  }
  
  /**
   * Get current position in phrase (0-1)
   * @returns 0 = phrase start, 1 = phrase end
   */
  getPhrasePosition(): number {
    return this.currentBeat / this.totalBeats;
  }
  
  /**
   * Check if we're at an important structural point
   * @returns True at structural points (every 2 bars)
   */
  isPhrasingPoint(): boolean {
    return this.currentBeat % (this.beatsPerBar * 2) === 0;
  }
  
  /**
   * Check if we should resolve to chord root
   * @returns True at end of phrase (last beat)
   */
  shouldResolve(): boolean {
    return this.currentBeat === this.totalBeats - 1;
  }
  
  /**
   * Get melodic contour bias
   * @returns "up" for first half of phrase, "down" for second half
   */
  getContourBias(): 'up' | 'down' {
    const position = this.getPhrasePosition();
    return position < 0.5 ? 'up' : 'down';
  }
  
  /**
   * Reset phrase position to start
   */
  reset(): void {
    this.currentBeat = 0;
  }
  
  /**
   * Get current beat number (0 to totalBeats-1)
   */
  getCurrentBeat(): number {
    return this.currentBeat;
  }
}

