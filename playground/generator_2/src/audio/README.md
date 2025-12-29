# Audio Layers Architecture

This directory contains the audio synthesis layers that create the musical content for the autonomous engine. Each layer is responsible for generating a specific part of the musical arrangement.

## Overview

The audio system is built on the Web Audio API and uses a layered architecture:

- **BaseAudioLayer**: Abstract base class providing common functionality
- **BassLayer**: Low-frequency foundation playing root notes
- **DrumLayer**: Rhythmic percussion (kick, snare, hi-hat)
- **PadLayer**: Sustained harmonic pads that follow chord changes
- **GenerativeMelody**: Algorithmic melody generation with Markov-like behavior

All layers use precise time-based scheduling via `AudioContext.currentTime` to ensure synchronization.

---

## BaseAudioLayer

**File**: `BaseAudioLayer.ts`

The foundation class that all audio layers extend. It provides:

### Key Features

- **Active Node Tracking**: Maintains a `Set<AudioNodeRef>` of all currently playing audio nodes
- **Tempo Management**: Provides `getBeatDuration()` helper (60 / tempo)
- **Unified Stop Logic**: Implements `stop()` method that properly disconnects and stops all active nodes
- **Logging Integration**: Built-in logging support via the logger utility

### AudioNodeRef Interface

```typescript
interface AudioNodeRef {
  source: AudioScheduledSourceNode;  // Oscillator or BufferSource
  gain: GainNode;                   // Volume control
  filter?: BiquadFilterNode;        // Optional filter
}
```

### Lifecycle

1. **Construction**: Takes `AudioContext`, `tempo`, and `moduleName`
2. **Node Creation**: Child classes create nodes and add them via `addActiveNode()`
3. **Scheduling**: Child classes implement `start()` to schedule audio events
4. **Cleanup**: `stop()` disconnects all nodes and clears the active set

---

## BassLayer

**File**: `BassLayer.ts`  
**Extends**: `BaseAudioLayer`

Provides the low-frequency foundation of the track by playing root notes of the current chord.

### Synthesis Architecture

```
Oscillator (sawtooth) → Lowpass Filter (200Hz) → Gain → Destination
```

- **Oscillator Type**: Sawtooth wave (rich harmonics)
- **Filter**: Lowpass at 200Hz with Q=2 (removes high frequencies, keeps bass)
- **Octave**: Plays in octave 2 (e.g., A2, F2, C2, G2)

### Pattern

Plays on **beats 1 and 3** of each bar (0-indexed: 0, 2, 8, 10, 16, 18, 24, 26 in an 8-bar loop).

### Note Duration

Each note is a **half note** (2 beats), creating a steady, pulsing bass line.

### Envelope (ADSR)

- **Attack**: 0.01s (instant)
- **Decay**: 0.2s
- **Sustain**: 30% of volume
- **Release**: 0.5s
- **Volume**: 0.4 (40% of max)

### Chord Following

The bass automatically follows the chord progression:
- Calculates which bar a beat belongs to
- Gets the chord for that bar from `ChordProgressionManager`
- Plays the root note of that chord

### Scheduling

- Schedules 4 loops ahead (128 beats total)
- Uses `Set<number>` to prevent duplicate scheduling
- Each note is scheduled with precise timing relative to `AudioContext.currentTime`

---

## DrumLayer

**File**: `DrumLayer.ts`  
**Extends**: `BaseAudioLayer`

Generates three types of percussion sounds: kick, snare, and hi-hat.

### Kick Drum

**Synthesis**:
```
Oscillator (sine, 60Hz → 30Hz) → Gain → Destination
```

- **Type**: Sine wave oscillator
- **Frequency Sweep**: Starts at 60Hz, exponentially ramps to 30Hz over 0.1s (creates the "thump")
- **Duration**: 0.2s
- **Volume**: 0.6
- **Pattern**: Beats 1 and 3 of every bar

**Envelope**:
- Instant attack (0.001s)
- Exponential decay to 0.01 over 0.1s
- Linear fade to 0 by 0.2s

### Snare Drum

**Synthesis**:
```
White Noise Buffer → Gain → Destination
```

- **Type**: White noise (random audio buffer)
- **Buffer Size**: 100ms of noise (sampleRate * 0.1)
- **Duration**: 0.15s
- **Volume**: 0.4
- **Pattern**: Beats 2 and 4 of every bar (backbeat)

**Envelope**:
- Instant attack
- Exponential decay to 0.01 over 0.05s
- Linear fade to 0 by 0.15s

### Hi-Hat

**Synthesis**:
```
Oscillator (square, 800Hz) → Gain → Destination
```

- **Type**: Square wave at 800Hz (bright, percussive)
- **Duration**: 0.05s (very short)
- **Volume**: 0.2
- **Pattern**: 8th notes (every 0.5 beats)

**Envelope**:
- Instant attack
- Exponential decay to 0.01 over 0.02s
- Linear fade to 0 by 0.05s

### Pattern Structure

- **Kick**: 16 hits per 8-bar loop (beats 1 and 3 of each bar)
- **Snare**: 16 hits per 8-bar loop (beats 2 and 4 of each bar)
- **Hi-Hat**: 64 hits per 8-bar loop (every 8th note)

### Scheduling

Each drum type has its own `Set<number>` to track scheduled beats, preventing duplicates. The layer schedules 4 loops ahead (128 beats).

---

## PadLayer

**File**: `PadLayer.ts`  
**Does NOT extend BaseAudioLayer** (uses custom Voice class)

Creates sustained harmonic pads that change with the chord progression. Each chord is played as a triad with long, evolving tones.

### Voice Class

Each note in a chord is represented by a `Voice`:

**Synthesis**:
```
Oscillator (sine) → Lowpass Filter (2000Hz) → Gain → Destination
```

- **Oscillator**: Sine wave (pure tone)
- **Filter**: Lowpass at 2000Hz with Q=1 (warm, mellow sound)
- **Duration**: 2 bars (8 beats) - very long sustained notes

### Chord Changes

- Changes every **2 bars** (8 beats)
- When a new chord is scheduled, all previous voices are stopped
- New voices are created for each note in the new chord
- Typically 3 voices per chord (triads)

### Envelope (ADSR)

- **Attack**: 0.8s (slow, gradual fade-in)
- **Sustain**: 70% of volume
- **Release**: 2.0s (long fade-out)
- **Volume**: 0.15 (15% - pads are background texture)

### Effects

#### Reverb

A simple delay-based reverb effect:
```
Delay (50ms) → Feedback Gain (30%) → Delay (loop)
              ↓
         Wet Gain (50%) → Destination
```

Creates a sense of space and depth.

#### LFO (Low-Frequency Oscillator)

- **Frequency**: 0.5 Hz (2-second cycle)
- **Modulation**: ±300 Hz on filter frequency
- **Purpose**: Adds subtle movement and life to the pads

The LFO is started once when the layer starts and stopped/recreated when the layer stops.

### Scheduling

- Schedules chord changes at beats: 0, 8, 16, 24 (every 2 bars)
- Schedules 4 loops ahead (128 beats)
- Each chord voice plays for the full 2-bar duration

---

## GenerativeMelody

**File**: `GenerativeMelody.ts`  
**Extends**: `BaseAudioLayer`

Generates melodic content algorithmically with configurable complexity. The melody system uses a modular architecture for clean separation of concerns.

### Module Architecture

```
GenerativeMelody (orchestrator)
├── NoteSelector      - Musical decision-making (which note to play)
├── MelodySynth       - Sound synthesis (how notes sound)
├── PhraseStructure   - Phrase tracking and resolution
├── RhythmicPattern   - Note duration patterns
├── MotifMemory       - Melodic motif development
└── melodyConfig      - Centralized configuration
```

### Sub-Modules

#### NoteSelector (`NoteSelector.ts`)
Handles all musical note selection logic:
- Beat-aware note selection (strong/weak beats)
- Melodic direction tracking (maintains contour)
- Multiple selection strategies (simple, directional, approach notes)
- Range constraints (keeps melody in comfortable range)

#### MelodySynth (`MelodySynth.ts`)
Handles audio synthesis:
- Dual-oscillator design (triangle + sine for warmth)
- Low-pass filter for tone shaping
- Delay effect with filtered feedback
- Configurable ADSR envelope

#### melodyConfig (`melodyConfig.ts`)
Centralized configuration:
- All magic numbers in one place
- TypeScript interfaces for type safety
- Easy tuning without code changes

### Synthesis Architecture

```
Oscillator1 (triangle) → Gain1 (0.7) ─┬→ Filter (4kHz) → Gain → Destination
Oscillator2 (sine)     → Gain2 (0.3) ─┘                    ↓
                                                        Delay → Filter → Feedback
                                                          ↓
                                                      Wet Gain → Destination
```

### Complexity System (0-1)

The complexity parameter controls melodic sophistication:

| Tier | Complexity | Behavior |
|------|------------|----------|
| 1 | 0.0-0.1 | Only chord tones, pure stepwise motion |
| 2 | 0.1-0.3 | Chord tones on strong beats, scale steps on weak |
| 3 | 0.3-0.5 | Directional chord tones, approach notes |
| 4 | 0.5-0.7 | Motif repetition and variation |
| 5 | 0.7-1.0 | Dissonance and chromatic approaches |

### Complexity Parameters

Each sub-parameter scales with complexity:
- **Passing Tone Probability**: 0 → 30%
- **Rhythmic Variation**: 0 → 40%
- **Phrase Awareness**: 0 → 70%
- **Dissonance Tolerance**: 0 → 15%
- **Rest Probability**: 50% → 20% (inverted)

### Melodic Features

#### Beat Awareness
- Strong beats (1, 3) prefer chord tones
- Weak beats allow passing tones
- Rests less likely on strong beats

#### Direction Tracking
- Melodies continue in a direction for 3-5 notes
- Creates natural melodic arcs
- Direction changes at phrase boundaries

#### Phrase Resolution
- 4-bar phrase structure
- Resolves to root note at phrase end
- Direction reverses after resolution

### Envelope (ADSR)

Optimized for connected, legato phrasing:
- **Attack**: 30ms (smooth onset)
- **Decay**: 60ms (moderate)
- **Sustain**: 70% (stays present)
- **Release**: 180ms (clean fade)
- **Note Overlap**: 50ms (creates legato)

### Delay Effect

- **Delay Time**: 8th note (0.5 beats)
- **Feedback**: 35% (moderate echo)
- **Wet Mix**: 40%
- **Filter**: 4.5kHz (bright delays)

### Energy Control

The `setComplexity()` method provides dynamic control:
- Lower complexity = simpler melodies = calmer energy
- Higher complexity = elaborate melodies = higher energy

---

## Time-Based Scheduling

All layers use the Web Audio API's precise scheduling system:

### How It Works

1. **Current Time**: `AudioContext.currentTime` provides the exact audio timeline
2. **Future Scheduling**: Events are scheduled at `currentTime + offset`
3. **Precision**: Sub-millisecond accuracy ensures perfect synchronization

### Example

```typescript
const now = this.context.currentTime;
const scheduleTime = now + 0.5; // 500ms in the future
oscillator.start(scheduleTime);
oscillator.stop(scheduleTime + duration);
```

### Why This Matters

- All layers schedule events relative to the same timeline
- Chord changes happen simultaneously across layers
- No drift or timing issues
- Can schedule far into the future (4 loops = ~16 seconds at 120 BPM)

---

## Resource Management

### Active Node Tracking

Each layer maintains a set of active audio nodes:
- Nodes are added when created
- Nodes are removed when stopped
- Prevents memory leaks and allows proper cleanup

### Stop Behavior

When `stop()` is called:
1. All scheduled gain changes are cancelled
2. Gain is set to 0 immediately
3. Entire audio chain is disconnected (oscillator → filter → gain → destination)
4. Oscillators are stopped (if already started)
5. Active node sets are cleared

This ensures:
- No audio leakage
- No lingering scheduled events
- Clean state for next start

---

## Layer Interaction

The layers work together to create a cohesive musical experience:

1. **BassLayer** provides harmonic foundation (root notes)
2. **DrumLayer** provides rhythmic drive (kick, snare, hi-hat)
3. **PadLayer** provides harmonic color (chord tones)
4. **GenerativeMelody** provides melodic interest (chord-based melody)

All layers:
- Follow the same chord progression
- Use the same tempo
- Schedule relative to the same timeline
- Are started/stopped together by `AutonomousEngine`

---

## Extending the System

To create a new audio layer:

1. **Extend BaseAudioLayer** (or implement similar interface)
2. **Implement `start(startTime: number)`** to schedule your pattern
3. **Track active nodes** using `addActiveNode()`
4. **Use `getBeatDuration()`** for tempo calculations
5. **Follow the stop pattern** to ensure clean cleanup

### Example Structure

```typescript
export class MyLayer extends BaseAudioLayer {
  constructor(context: AudioContext, tempo: number) {
    super(context, tempo, "MyLayer");
  }

  start(startTime: number): void {
    // Schedule your pattern
    const beatDuration = this.getBeatDuration();
    // ... create nodes, schedule events
  }
}
```

---

## Technical Notes

### Web Audio API Nodes Used

- **OscillatorNode**: Generates periodic waveforms (sine, sawtooth, triangle, square)
- **AudioBufferSourceNode**: Plays back audio buffers (for noise/recorded samples)
- **GainNode**: Controls volume and applies envelopes
- **BiquadFilterNode**: Applies filtering (lowpass, highpass, etc.)
- **DelayNode**: Creates delay/echo effects
- **AudioContext**: The audio processing context

### Performance Considerations

- Nodes are created on-demand (not pre-allocated)
- Old nodes are properly disconnected to prevent memory leaks
- Scheduling happens in batches (4 loops ahead) to reduce overhead
- Duplicate scheduling is prevented via `Set` tracking

### Browser Compatibility

Requires modern browser with Web Audio API support:
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS 6+)
- Opera: Full support

---

## Debugging

Enable logging to see what each layer is doing:

```typescript
import { setLoggingEnabled } from "../utils/logger";

setLoggingEnabled(true);
```

This will log:
- When notes/drums/chords are scheduled
- Timing information (time until start)
- Stop operations and node counts

---

## Summary

The audio layer system provides:

✅ **Modular Design**: Each layer is independent and focused  
✅ **Precise Timing**: Web Audio API scheduling ensures perfect sync  
✅ **Resource Safety**: Proper cleanup prevents leaks  
✅ **Extensibility**: Easy to add new layers  
✅ **Musical Coherence**: All layers follow the same progression and tempo  

Together, these layers create a rich, evolving musical texture that loops seamlessly.

