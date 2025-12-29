import { CONFIG } from "../music/config";
import { ChordProgressionManager } from "../music/ChordProgressionManager";
import { BassLayer } from "../audio/BassLayer";
import { DrumLayer } from "../audio/DrumLayer";
import { PadLayer } from "../audio/PadLayer";
import { GenerativeMelody } from "../audio/GenerativeMelody";

export class AutonomousEngine {
  private context: AudioContext | null = null;
  private chordManager: ChordProgressionManager;
  private bassLayer: BassLayer | null = null;
  private drumLayer: DrumLayer | null = null;
  private padLayer: PadLayer | null = null;
  private melodyLayer: GenerativeMelody | null = null;
  private isPlaying: boolean = false;
  private isStarting: boolean = false;
  private barInterval: number | null = null;
  private startTime: number = 0;
  private barCounter: number = 0;
  
  // Layer enable/disable flags
  private bassEnabled: boolean = true;
  private drumEnabled: boolean = true;
  private padEnabled: boolean = true;
  private melodyEnabled: boolean = true;

  constructor() {
    this.chordManager = new ChordProgressionManager(
      CONFIG.chordProgression,
      CONFIG.barsPerChord,
    );
  }

  private ensureContext(): AudioContext {
    if (!this.context) {
      this.context = new AudioContext();
    }
    return this.context;
  }

  async start(): Promise<void> {
    // Prevent concurrent starts
    if (this.isPlaying || this.isStarting) {
      return;
    }

    this.isStarting = true;

    try {
      // Stop any existing layers first (in case of partial state)
      this.isPlaying = false;
      if (this.barInterval !== null) {
        clearInterval(this.barInterval);
        this.barInterval = null;
      }
      this.stopLayers();

      const context = this.ensureContext();
      // Resume context if suspended
      if (context.state === "suspended") {
        await context.resume();
      }

      // Initialize layers
      this.bassLayer = new BassLayer(context, this.chordManager, CONFIG.tempo);
      this.drumLayer = new DrumLayer(context, CONFIG.tempo);
      this.padLayer = new PadLayer(context, this.chordManager, CONFIG.tempo);
      this.melodyLayer = new GenerativeMelody(
        context,
        this.chordManager,
        CONFIG.tempo,
      );

      // Reset state
      this.chordManager.reset();
      this.barCounter = 0;
      this.startTime = context.currentTime + 0.1; // Small delay for scheduling

      // Start enabled layers
      if (this.bassEnabled && this.bassLayer) {
        this.bassLayer.start(this.startTime);
      }
      if (this.drumEnabled && this.drumLayer) {
        this.drumLayer.start(this.startTime);
      }
      if (this.padEnabled && this.padLayer) {
        this.padLayer.start(this.startTime);
      }
      if (this.melodyEnabled && this.melodyLayer) {
        this.melodyLayer.start(this.startTime);
      }

      // Start bar counter to advance chord progression
      const beatDuration = 60 / CONFIG.tempo;
      const barDuration = beatDuration * CONFIG.beatsPerBar * 1000; // Convert to ms

      this.barInterval = (globalThis.setInterval || setInterval)(() => {
        // Check if we're still playing before re-scheduling
        if (!this.isPlaying || !this.context) {
          return;
        }

        this.barCounter++;
        this.chordManager.advance();

        // Re-schedule layers periodically to keep playing
        if (this.barCounter % 32 === 0) {
          const currentTime = this.context.currentTime;
          const nextLoopStart = currentTime + 0.1;
          if (this.bassEnabled && this.bassLayer) {
            this.bassLayer.start(nextLoopStart);
          }
          if (this.drumEnabled && this.drumLayer) {
            this.drumLayer.start(nextLoopStart);
          }
          if (this.padEnabled && this.padLayer) {
            this.padLayer.start(nextLoopStart);
          }
          if (this.melodyEnabled && this.melodyLayer) {
            this.melodyLayer.start(nextLoopStart);
          }
        }
      }, barDuration);

      this.isPlaying = true;
    } finally {
      this.isStarting = false;
    }
  }

  async stop(): Promise<void> {
    // Set playing to false first to prevent re-scheduling
    this.isPlaying = false;

    // Clear interval immediately
    if (this.barInterval !== null) {
      clearInterval(this.barInterval);
      this.barInterval = null;
    }

    // Stop all layers (this stops all active audio nodes)
    this.stopLayers();

    // Reset state
    this.chordManager.reset();
    this.barCounter = 0;
  }

  private stopLayers(): void {
    if (this.bassLayer) {
      this.bassLayer.stop();
      this.bassLayer = null;
    }
    if (this.drumLayer) {
      this.drumLayer.stop();
      this.drumLayer = null;
    }
    if (this.padLayer) {
      this.padLayer.stop();
      this.padLayer = null;
    }
    if (this.melodyLayer) {
      this.melodyLayer.stop();
      this.melodyLayer = null;
    }
  }

  setEnergy(level: number): void {
    // level: 0-1
    // Modulate melody rest probability
    if (this.melodyLayer) {
      // Less rests = more energy
      const restProbability = 0.6 - level * 0.4;
      this.melodyLayer.setRestProbability(restProbability);
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  // Calculate the next loop boundary to resync layers
  private getNextSyncTime(): number {
    if (!this.context) return 0;
    const currentTime = this.context.currentTime;
    const beatDuration = 60 / CONFIG.tempo;
    const loopDuration = beatDuration * 32; // 8 bars = 32 beats
    const timeSinceStart = currentTime - this.startTime;
    const loopsElapsed = Math.floor(timeSinceStart / loopDuration);
    const nextLoopStart = this.startTime + (loopsElapsed + 1) * loopDuration;
    return Math.max(nextLoopStart, currentTime + 0.1);
  }

  setBassEnabled(enabled: boolean): void {
    this.bassEnabled = enabled;
    if (this.isPlaying && this.context) {
      if (enabled && this.bassLayer) {
        // Wait for next loop boundary to resync
        const syncTime = this.getNextSyncTime();
        this.bassLayer.start(syncTime);
      } else if (!enabled && this.bassLayer) {
        this.bassLayer.stop();
      }
    }
  }

  setDrumEnabled(enabled: boolean): void {
    this.drumEnabled = enabled;
    if (this.isPlaying && this.context) {
      if (enabled && this.drumLayer) {
        const syncTime = this.getNextSyncTime();
        this.drumLayer.start(syncTime);
      } else if (!enabled && this.drumLayer) {
        this.drumLayer.stop();
      }
    }
  }

  setPadEnabled(enabled: boolean): void {
    this.padEnabled = enabled;
    if (this.isPlaying && this.context) {
      if (enabled && this.padLayer) {
        const syncTime = this.getNextSyncTime();
        this.padLayer.start(syncTime);
      } else if (!enabled && this.padLayer) {
        this.padLayer.stop();
      }
    }
  }

  setMelodyEnabled(enabled: boolean): void {
    this.melodyEnabled = enabled;
    if (this.isPlaying && this.context) {
      if (enabled && this.melodyLayer) {
        const syncTime = this.getNextSyncTime();
        this.melodyLayer.start(syncTime);
      } else if (!enabled && this.melodyLayer) {
        this.melodyLayer.stop();
      }
    }
  }

  getBassEnabled(): boolean {
    return this.bassEnabled;
  }

  getDrumEnabled(): boolean {
    return this.drumEnabled;
  }

  getPadEnabled(): boolean {
    return this.padEnabled;
  }

  getMelodyEnabled(): boolean {
    return this.melodyEnabled;
  }
}

