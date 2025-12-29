/**
 * Configuration constants for GenerativeMelody
 * Centralizes all magic numbers for easy tuning and maintenance
 */

/** Envelope settings for different articulation styles */
export interface EnvelopeConfig {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  volume: number;
}

/** Delay effect settings */
export interface DelayConfig {
  timeMultiplier: number; // Multiplier of beat duration
  feedback: number;
  wetMix: number;
  filterFrequency: number;
}

/** Synth oscillator settings */
export interface SynthConfig {
  primaryWaveform: OscillatorType;
  secondaryWaveform: OscillatorType;
  primaryGain: number;
  secondaryGain: number;
  detuneRatio: number;
  filterFrequency: number;
  filterQ: number;
}

/** Complexity scaling factors (how much each parameter scales with complexity 0-1) */
export interface ComplexityScaling {
  passingToneMax: number;
  rhythmicVariationMax: number;
  phraseAwarenessMax: number;
  dissonanceToleranceMax: number;
  restProbabilityBase: number;
  restProbabilityRange: number;
}

/** Melodic behavior settings */
export interface MelodicBehavior {
  minRange: string; // e.g., "A3"
  maxRange: string; // e.g., "E5"
  maxStepsInDirection: number;
  directionChangeBase: number;
  directionChangeProbability: number;
  strongBeatRestReduction: number;
  preferredStartInterval: number; // 0 = root, 2 = fifth
  rootPreference: number; // Probability of starting on root
}

/** Complete melody configuration */
export interface MelodyConfig {
  envelope: EnvelopeConfig;
  delay: DelayConfig;
  synth: SynthConfig;
  complexity: ComplexityScaling;
  melodic: MelodicBehavior;
  noteOverlapMs: number;
  barsPerPhrase: number;
  initialComplexity: number;
}

/**
 * Default melody configuration
 * These values have been tuned for a balanced, musical sound
 */
export const DEFAULT_MELODY_CONFIG: MelodyConfig = {
  envelope: {
    attack: 0.03,    // 30ms - quick but smooth onset
    decay: 0.06,     // 60ms - moderate decay
    sustain: 0.7,    // 70% - good sustain level
    release: 0.18,   // 180ms max - clean fade out
    volume: 0.28,    // Slightly louder for presence
  },
  
  delay: {
    timeMultiplier: 0.5,    // 8th note delay
    feedback: 0.35,         // Moderate feedback
    wetMix: 0.4,            // Moderate wet signal
    filterFrequency: 4500,  // Brighter delays
  },
  
  synth: {
    primaryWaveform: "triangle",
    secondaryWaveform: "sine",
    primaryGain: 0.7,
    secondaryGain: 0.3,
    detuneRatio: 1.001,     // Very slight detune
    filterFrequency: 4000,  // Higher cutoff = brighter
    filterQ: 1.0,           // Slight resonance
  },
  
  complexity: {
    passingToneMax: 0.3,          // Up to 30% passing tones at max complexity
    rhythmicVariationMax: 0.4,    // Up to 40% rhythmic variation
    phraseAwarenessMax: 0.7,      // Up to 70% phrase awareness
    dissonanceToleranceMax: 0.15, // Up to 15% dissonance
    restProbabilityBase: 0.5,     // 50% rest at complexity 0
    restProbabilityRange: 0.3,    // Reduces to 20% at complexity 1
  },
  
  melodic: {
    minRange: "A3",
    maxRange: "E5",
    maxStepsInDirection: 3,       // Base steps before direction change
    directionChangeBase: 2,       // Additional steps based on complexity
    directionChangeProbability: 0.6,
    strongBeatRestReduction: 0.3, // 30% of normal rest probability on strong beats
    preferredStartInterval: 2,    // Index 2 = fifth
    rootPreference: 0.7,          // 70% chance to start on root
  },
  
  noteOverlapMs: 50,    // 50ms overlap between notes
  barsPerPhrase: 4,     // 4-bar phrases
  initialComplexity: 0.5,
};

/**
 * Calculate complexity-derived parameters
 */
export function calculateComplexityParams(
  complexity: number,
  scaling: ComplexityScaling
): {
  passingToneProbability: number;
  rhythmicVariation: number;
  phraseAwareness: number;
  dissonanceTolerance: number;
  restProbability: number;
} {
  const clampedComplexity = Math.max(0, Math.min(1, complexity));
  
  return {
    passingToneProbability: clampedComplexity * scaling.passingToneMax,
    rhythmicVariation: clampedComplexity * scaling.rhythmicVariationMax,
    phraseAwareness: clampedComplexity * scaling.phraseAwarenessMax,
    dissonanceTolerance: clampedComplexity * scaling.dissonanceToleranceMax,
    restProbability: scaling.restProbabilityBase - (clampedComplexity * scaling.restProbabilityRange),
  };
}

