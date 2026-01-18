/**
 * Utilities for managing Web Audio API nodes
 */

export interface AudioNodeGroup {
  source: AudioScheduledSourceNode;
  gain: GainNode;
  filter?: BiquadFilterNode;
}

/**
 * Safely stops and disconnects an audio node group
 */
export function stopAudioNodeGroup(
  group: AudioNodeGroup,
  context: AudioContext,
): void {
  const now = context.currentTime;

  try {
    // Cancel all scheduled gain changes
    group.gain.gain.cancelScheduledValues(now);
    // Set gain to 0 immediately
    group.gain.gain.setValueAtTime(0, now);
    // Cancel far into the future
    group.gain.gain.cancelScheduledValues(now + 100);
    group.gain.gain.setValueAtTime(0, now + 0.1);
    group.gain.gain.setValueAtTime(0, now + 1.0);
  } catch (e) {
    // Ignore errors
  }

  // Disconnect entire chain (destination backwards to source)
  try {
    group.gain.disconnect();
  } catch (e) {
    // May already be disconnected
  }

  if (group.filter) {
    try {
      group.filter.disconnect();
    } catch (e) {
      // May already be disconnected
    }
  }

  try {
    group.source.disconnect();
  } catch (e) {
    // May already be disconnected
  }

  // Try to stop source if it's already started
  try {
    group.source.stop(now);
  } catch (e) {
    // Source may not have started yet - that's okay, it's disconnected
  }
}

/**
 * Creates an ADSR envelope on a gain node
 */
export function applyEnvelope(
  gain: GainNode,
  scheduleTime: number,
  duration: number,
  params: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
    volume: number;
  },
): void {
  const { attack, decay, sustain, release, volume } = params;
  const attackEnd = scheduleTime + attack;
  const decayEnd = attackEnd + decay;
  const releaseStart = scheduleTime + duration - release;

  gain.gain.setValueAtTime(0, scheduleTime);
  gain.gain.linearRampToValueAtTime(volume, attackEnd);
  gain.gain.linearRampToValueAtTime(volume * sustain, decayEnd);
  gain.gain.setValueAtTime(volume * sustain, releaseStart);
  gain.gain.linearRampToValueAtTime(0, scheduleTime + duration);
}


