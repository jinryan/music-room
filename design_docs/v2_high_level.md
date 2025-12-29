# Music Room — V2 Design Document

## Context

V1 established the **architectural spine** of the Music Room:

- Fast reflex path for immediacy
- Clear separation between impulses, interpretation, and sound production
- A working end-to-end system that maps gesture → sound reliably

However, V1 still *feels like an instrument*:
- Sound only exists while the user actively moves
- Gestures map directly to notes or note boundaries
- The room has no musical memory, momentum, or tendencies

V2 is the first version where the room becomes a **stateful musical system** rather than a reactive mapper.

This document defines V2 purely in terms of **experience and system behavior**, not implementation steps.

---

## Goals

### Primary Goals

1. **Musical Inertia**
   - Music can continue briefly without constant user motion
   - Sound decays, stabilizes, or simplifies rather than hard-stopping

2. **Gesture as Bias, Not Command**
   - Gestures influence *how music behaves* over time
   - No gesture maps 1:1 to a specific musical outcome

3. **Short-Term Musical Memory**
   - The room has a recognizable “current state” or “mood”
   - This state persists for seconds and can be nudged, not overridden

4. **Legible but Non-Deterministic Behavior**
   - Users can form mental models (“when I do X, it tends to…”)
   - Unintended but interpretable consequences are allowed

5. **Human-Ignited, Not Autonomous**
   - The system never generates music unless activated by human input
   - Persistence exists, but always decays without reinforcement

---

## Non-Goals

- Long-form autonomous composition
- Explicit musical form (sections, verses, etc.)
- Complex harmonic logic (chord progressions, modulation)
- Multiple independent instruments or voices
- Symbolic gesture languages (e.g. “this gesture means arpeggio”)
- High realism instrument synthesis

V2 optimizes **felt agency and musical continuity**, not breadth.

---

## User Experience

### First-Person Experience Description

- When I move, I *ignite* music.
- When I pause, the music does not instantly disappear.
- My movement affects the *character* of the music, not just notes.
- The room feels like it is currently “in a state.”
- I can calm, agitate, thicken, or thin the music.
- Stillness causes the music to simplify and eventually fade.

### Key Experiential Shifts from V1 → V2

| Aspect | V1 | V2 |
|-----|----|----|
| Sound continuity | Only during motion | Persists briefly |
| Gesture meaning | Triggers notes | Biases behavior |
| System memory | None | Short-term |
| Control feeling | Direct | Steering |
| Silence | Default | Result |

---

## Experience → System Capabilities

| Experience | Required Capability |
|----------|---------------------|
| Music lingers | Engine state persistence + decay |
| Movement changes character | Continuous motion descriptors in unified context |
| Room has “mood” | BiasState with inertia |
| Pausing doesn’t hard-stop | Decoupling sound from motion |
| Stillness leads to silence | Energy decay model |

---

## High-Level Engineering Design

### 1. AnalyzeMotion

**Purpose**
Analyze movement and produce motion context containing continuous motion descriptors and discrete motion events.

**Responsibilities**
- Consume `FeatureFrame` (low-level features: position, velocity, speed)
- Aggregate and analyze motion to produce `MotionContext` containing:
  - **Features**: Low-level kinematic data (position, velocity, speed)
  - **Motion descriptors** (continuous, computed every frame):
    - Motion energy (speed × amplitude)
    - Motion continuity (smooth vs jittery)
    - Engagement (moving / hovering / absent)
  - **Motion events** (discrete, sparse):
    - MOVE_START
    - MOVE_END
    - DIRECTION_CHANGE
- Output unified `MotionContext` that aggregates all motion data for a single moment in time

**Key Properties**
- Stateful with windowed history (10-20 frames) for temporal analysis
- High update rate (every frame)
- No musical interpretation
- Aggregates at producer side so downstream consumers receive complete frame

---

### 2. Reflex Impulse Renderer

**Purpose**
Guarantee immediacy and embodiment.

**Responsibilities**
- Consume `MotionContext` (unified context with features, motion descriptors, and events)
- Convert motion events into short-lived render impulses:
  - noteOn
  - noteOff
  - accents
  - retriggers
- Use motion descriptors and features for immediate parameter control (e.g., pitch from hand position)
- Never block or wait on interpretation
- No memory beyond milliseconds

**Key Properties**
- Fast
- Deterministic
- Always responsive

---

### 3. Intent Interpreter (V2)

**Purpose**
Infer *musical tendencies* from recent movement history.

**Responsibilities**
- Consume `MotionContext` (unified context with features, motion descriptors, and events)
- Maintain windowed history of recent `MotionContext`s (hundreds of ms to seconds)
- Output continuously updated `BiasState`, e.g.:
  - Energy (calm ↔ intense)
  - Density preference (sparse ↔ busy)
  - Stability (smooth ↔ unstable)

**Characteristics**
- Operates on windows of recent history (hundreds of ms to seconds)
- Updates slowly relative to reflex path
- Never emits musical events directly
- Biases probabilities, ranges, and decay rates

---

### 4. Music Engine (Stateful Core)

**Purpose**
Act as the “pond” — a dynamical musical system with memory and inertia.

**Responsibilities**
- Maintain musical state:
  - active notes or figures
  - decay timers
  - internal energy
- Accept:
  - Reflex render impulses
  - BiasState updates
- Decide:
  - Whether material persists
  - How it decays or mutates
  - When silence emerges

**Key Properties**
- Owns musical memory
- Never frame-based
- Human-ignited only
- Decay toward silence if unperturbed

---

### 5. Audio Engine

**Purpose**
Render perceptually meaningful differences in state.

**V2 Scope**
- One instrument voice
- Multiple timbral regimes (e.g. smooth vs articulated)
- Parameter control over:
  - envelope length
  - brightness
  - articulation

**Behavior**
- Responds to engine state smoothly
- Avoids abrupt parameter jumps unless triggered by reflex events

---

## Unit Testing Strategy

### AnalyzeMotion
- Feed synthetic `FeatureFrame` data
- Verify extracted motion descriptors (energy, continuity, engagement)
- Verify motion event detection thresholds
- Verify unified `MotionContext` structure contains all expected fields

### Reflex Impulse Renderer
- Deterministic mapping tests
- Given `MotionContext` with events → expected render impulses
- Given `MotionContext` with motion descriptors → expected parameter controls
- No dependency on interpreter or engine

### Intent Interpreter
- Feed recorded `MotionContext` histories
- Assert BiasState trends (monotonic changes, smoothing)
- Test time-based inertia and decay
- Verify consumption of both motion descriptors and events from unified context

### Music Engine
- Simulate sequences of impulses and biases
- Assert:
  - persistence behavior
  - decay timing
  - bounded randomness
- No audio required for unit tests

### Audio Engine
- Parameter transition tests
- Envelope and filter response over time
- Ensure no discontinuities unless intended

---

## Integration Testing

### Scenario-Based Tests

1. **Ignition → Pause → Decay**
   - User moves briefly, then stops
   - Music persists and fades, not hard-stops

2. **Energy Modulation**
   - Fast, large gestures increase activity
   - Slow, small gestures calm system

3. **Bias Steering**
   - Sustained movement biases system
   - Single impulse does not override state

4. **Silence as Outcome**
   - No input for long enough leads to silence
   - Re-engagement re-ignites system

### Evaluation Criteria
- Musical continuity
- Perceived responsiveness
- Interpretability of system behavior
- Absence of “dead” or confusing states

---

## One-Line V2 Thesis

**V2 transforms the Music Room from a reactive instrument into a stateful musical system whose trajectory the human steers rather than commands.**
