/**
 * MelodySynth - Handles audio synthesis for melody notes
 * Separates sound design concerns from note selection logic
 */

import { applyEnvelope } from "../utils/audioNodes";
import type { EnvelopeConfig, SynthConfig, DelayConfig } from "./melodyConfig";
import { DEFAULT_MELODY_CONFIG } from "./melodyConfig";

/** Audio node group returned by synth creation */
export interface SynthNodeGroup {
  source: OscillatorNode;
  secondarySource?: OscillatorNode;
  gain: GainNode;
  filter?: BiquadFilterNode;
}

/** Delay effect node group */
export interface DelayNodeGroup {
  delay: DelayNode;
  feedback: GainNode;
  wet: GainNode;
  filter: BiquadFilterNode;
}

/**
 * Creates and manages melody synthesizer nodes
 */
export class MelodySynth {
  private context: AudioContext;
  private synthConfig: SynthConfig;
  private envelopeConfig: EnvelopeConfig;
  private delayNodes: DelayNodeGroup | null = null;

  constructor(
    context: AudioContext,
    synthConfig: SynthConfig = DEFAULT_MELODY_CONFIG.synth,
    envelopeConfig: EnvelopeConfig = DEFAULT_MELODY_CONFIG.envelope
  ) {
    this.context = context;
    this.synthConfig = synthConfig;
    this.envelopeConfig = envelopeConfig;
  }

  /**
   * Set up the delay effect chain
   */
  setupDelay(beatDuration: number, config: DelayConfig = DEFAULT_MELODY_CONFIG.delay): DelayNodeGroup {
    const delay = this.context.createDelay(2.0);
    delay.delayTime.value = beatDuration * config.timeMultiplier;

    const feedback = this.context.createGain();
    feedback.gain.value = config.feedback;

    const wet = this.context.createGain();
    wet.gain.value = config.wetMix;

    const filter = this.context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = config.filterFrequency;

    // Connect: delay -> filter -> feedback -> delay (loop)
    delay.connect(filter);
    filter.connect(feedback);
    feedback.connect(delay);
    
    // Output: delay -> wet -> destination
    delay.connect(wet);
    wet.connect(this.context.destination);

    this.delayNodes = { delay, feedback, wet, filter };
    return this.delayNodes;
  }

  /**
   * Get the delay input node for connecting synth outputs
   */
  getDelayInput(): DelayNode | null {
    return this.delayNodes?.delay ?? null;
  }

  /**
   * Create a synth voice for a single note
   */
  createVoice(frequency: number): SynthNodeGroup {
    const { 
      primaryWaveform, 
      secondaryWaveform, 
      primaryGain: primGain, 
      secondaryGain: secGain,
      detuneRatio,
      filterFrequency,
      filterQ 
    } = this.synthConfig;

    // Primary oscillator
    const source = this.context.createOscillator();
    source.type = primaryWaveform;
    source.frequency.value = frequency;

    // Secondary oscillator (detuned for richness)
    const secondarySource = this.context.createOscillator();
    secondarySource.type = secondaryWaveform;
    secondarySource.frequency.value = frequency * detuneRatio;

    // Individual gain stages for mixing
    const primaryGain = this.context.createGain();
    primaryGain.gain.value = primGain;
    
    const secondaryGain = this.context.createGain();
    secondaryGain.gain.value = secGain;

    // Low-pass filter for tone shaping
    const filter = this.context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = filterFrequency;
    filter.Q.value = filterQ;

    // Master gain (for envelope)
    const gain = this.context.createGain();
    gain.gain.value = 0;

    // Connect signal chain
    source.connect(primaryGain);
    secondarySource.connect(secondaryGain);
    primaryGain.connect(filter);
    secondaryGain.connect(filter);
    filter.connect(gain);
    
    // Output to destination and delay
    gain.connect(this.context.destination);
    if (this.delayNodes) {
      gain.connect(this.delayNodes.delay);
    }

    return { source, secondarySource, gain, filter };
  }

  /**
   * Schedule a note with proper envelope and timing
   */
  scheduleNote(
    nodes: SynthNodeGroup,
    scheduleTime: number,
    duration: number,
    overlapMs: number = DEFAULT_MELODY_CONFIG.noteOverlapMs
  ): void {
    const extendedDuration = duration + overlapMs / 1000;
    const releaseTime = Math.min(
      this.envelopeConfig.release,
      extendedDuration * 0.4
    );

    // Start oscillators
    nodes.source.start(scheduleTime);
    nodes.secondarySource?.start(scheduleTime);

    // Stop oscillators (with small buffer)
    const stopTime = scheduleTime + extendedDuration + 0.02;
    nodes.source.stop(stopTime);
    nodes.secondarySource?.stop(stopTime);

    // Apply envelope
    applyEnvelope(nodes.gain, scheduleTime, extendedDuration, {
      attack: this.envelopeConfig.attack,
      decay: this.envelopeConfig.decay,
      sustain: this.envelopeConfig.sustain,
      release: releaseTime,
      volume: this.envelopeConfig.volume,
    });
  }

  /**
   * Update envelope configuration
   */
  setEnvelopeConfig(config: Partial<EnvelopeConfig>): void {
    this.envelopeConfig = { ...this.envelopeConfig, ...config };
  }

  /**
   * Update synth configuration
   */
  setSynthConfig(config: Partial<SynthConfig>): void {
    this.synthConfig = { ...this.synthConfig, ...config };
  }
}

