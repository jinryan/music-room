# Refactor Plan: Move V1 into Reflex + Engine Architecture

This document is a **step-by-step refactoring guide** to restructure the current V1 pipeline into the target architecture:

- **(1) Sensing + Feature Pipeline**: camera → pose → smoothed features + gesture/impulse events
- **(2) Intent Interpreter (slow module)**: exists as a module boundary in V1 but returns defaults (no-op)
- **(3) Reflex / Impulse Renderer (fast module)**: turns feature+gesture impulses into render commands
- **(4) Music Engine (audio)**: consumes render commands and produces sound

The goal is to keep V1 behavior the same while reshaping the codebase so V2/V3 can be added without re-plumbing.

---

## Motivation (Why refactor?)

The current V1 design uses a `MusicalIntentFrame` as a per-tick “snapshot” of music intent:

```
GestureEvent[] + FeatureFrame -> V1Mapper -> MusicalIntentFrame -> MonoSynthEngine
```

This works, but it blurs responsibilities:

- “Mapping” combines **impulse generation** and **musical control**.
- The audio engine is receiving something named “intent frame” (implies snapshot semantics).
- Adding V2/V3 requires mixing “fast” behavior (immediate gesture response) with “slow” behavior (intent/scene/constraints).

**New architecture** clarifies semantics:

- Reflex creates **render commands** (fast, low latency).
- Intent Interpreter (slow) provides **bias parameters** (V1: default/no-op).
- Music Engine renders commands into audio (owns voice state).

---

## Target Architecture (V1)

V1 should implement the full module boundary but keep complexity low:

```
CameraSource
  -> HandLandmarkerSensor
    -> SensorFrame
      -> FeatureExtractor
        -> FeatureFrame
          -> Gesture Detectors
            -> ImpulseEvents (GestureEvent[])
              -> ReflexImpulseRendererV1
                -> RenderPacket (RenderEvents + controls)
                  -> MonoSynthEngine (Music Engine V1)
```

Additionally, include (but no-op) the Intent Interpreter:

```
FeatureRingBuffer + EventRingBuffer + MusicalState
  -> IntentInterpreter (V1: returns default BiasState)
  -> BiasState (unused in V1 mapping)
```

---

## Refactor Goals (Definition of Done)

✅ Code compiles and runs with identical V1 interaction:
- MOVE_START triggers note on
- DIRECTION_CHANGE_X retriggers note
- hand height controls pitch
- sound plays via `MonoSynthEngine`

✅ New folder/module boundaries exist:
- `src/render` (render command types)
- `src/reflex` (fast mapping)
- `src/intent` (slow module stub)
- `src/engine` (music engine; may reuse `src/audio` if preferred)

✅ Engine consumes **render commands** rather than “intent frames”:
- rename/retarget `MusicalIntentFrame` → `RenderPacket`
- rename/retarget `MusicalEvent` → `RenderEvent`

✅ No behavior change for V1.

---

## Step 0 — Create a working branch and baseline verification

1. Create a new git branch (example name):
   - `refactor/architecture-v1-reflex-engine`


---

## Step 1 — Introduce `render` module (types only)

### 1.1 Create new files
Create:

- `musicroom/src/render/types.ts`

### 1.2 Define new types (minimal change)
Copy the shape of `MusicalIntentFrame` but rename it:

```ts
// A short-lived bundle of commands and continuous controls that tell the music engine what to do right now.
/*
It is:

ephemeral

stateless

idempotent

consumed immediately

Think of it as:

a MIDI message bundle

a draw call

an audio control message

a “tick worth of instructions”
*/
export type RenderPacket = {
  timestamp: number
  events: RenderEvent[]
  controls: Record<string, number>
  target?: {
    voiceId?: string
    channel?: string
  }
}

export type RenderEvent =
  | { type: 'noteOn'; voiceId?: string }
  | { type: 'noteOff'; voiceId?: string }
  | { type: 'retrigger'; voiceId?: string } // keep for future (engine already supports it)
```

Notes:
- Keep the shape similar to minimize churn.
- `voiceId` is optional in V1; you can provide it later for multi-voice.

### 1.3 Verify
- Typecheck/build should still pass because nothing uses this yet.

---

## Step 2 — Add `intent` module (V1 no-op)

### 2.1 Create `BiasState` type
Create:

- `musicroom/src/intent/types.ts`

```ts
export type BiasState = {
  updatedAt: number
  // Keep minimal; expand in V2/V3
  stability?: number
  entropy?: number
  registerBias?: number
  densityTarget?: number
}
```

### 2.2 Create IntentInterpreter stub
Create:

- `musicroom/src/intent/IntentInterpreter.ts`

```ts
import type { BiasState } from './types'

export class IntentInterpreter {
  private bias: BiasState = { updatedAt: 0, stability: 1, entropy: 0 }

  update(now: number): BiasState {
    // V1: no-op, always return defaults (overwrite-last semantics)
    // TODO (rjin): expand in v2/v3
    this.bias.updatedAt = now
    return this.bias
  }
}
```

### 2.3 Verify
- Build passes.
- You have an explicit module boundary for V2.

---

## Step 3 — Rename `V1Mapper` to Reflex module

### 3.1 Create new reflex folder
Create:

- `musicroom/src/reflex/`

### 3.2 Move/rename V1 mapper file
Move:

- `musicroom/src/mapping/V1Mapper.ts`  
to:
- `musicroom/src/reflex/ReflexImpulseRendererV1.ts`

Rename class to `ReflexImpulseRendererV1` (recommended).

### 3.3 Update imports/types
Replace imports:

- from `../mapping/types` (MusicalIntentFrame/MusicalEvent)  
to:
- from `../render/types` (RenderPacket/RenderEvent)

Example skeleton:

```ts
import { CONFIG } from '../app/config'
import type { FeatureFrame } from '../features/types'
import type { GestureEvent } from '../gestures/types'
import type { RenderPacket, RenderEvent } from '../render/types'
import { mapNormalizedToScaleMidi, midiToHz } from '../mapping/scale'

const VOICE_ID = 'lead'

export class ReflexImpulseRendererV1 {
  private isNoteOn = false

  update(frame: FeatureFrame, events: GestureEvent[]): RenderPacket {
    const renderEvents: RenderEvent[] = []

    const moveStart = events.some((e) => e.type === 'MOVE_START')
    const directionChange = events.some((e) => e.type === 'DIRECTION_CHANGE_X')

    if (moveStart && !this.isNoteOn) {
      this.isNoteOn = true
      renderEvents.push({ type: 'noteOn', voiceId: VOICE_ID })
    }

    if (directionChange) {
      if (this.isNoteOn) renderEvents.push({ type: 'noteOff', voiceId: VOICE_ID })
      renderEvents.push({ type: 'noteOn', voiceId: VOICE_ID })
      this.isNoteOn = true
    }

    const normalized = clamp(1 - frame.features.hand.position.y, 0, 1)
    const midi = mapNormalizedToScaleMidi(
      normalized,
      CONFIG.mapping.pitch.minMidi,
      CONFIG.mapping.pitch.maxMidi,
      CONFIG.mapping.pitch.scale,
      CONFIG.mapping.pitch.mode
    )
    const pitchHz = midiToHz(midi)

    return {
      timestamp: frame.timestamp,
      events: renderEvents,
      controls: { pitchHz },
      target: { voiceId: VOICE_ID },
    }
  }
}
```

Notes:
- You can keep `scale.ts` under `mapping/` for now; it’s just a utility.
- In V1, the reflex module does not need BiasState; leave it out for now.

### 3.4 Update any imports that referenced `V1Mapper`
- Search for `V1Mapper` usage and update to the new location/name.

### 3.5 Verify
- Typecheck/build should pass after wiring updates (next steps).

---

## Step 4 — Update `MonoSynthEngine` to consume `RenderPacket`

### 4.1 Update imports
In `musicroom/src/audio/MonoSynthEngine.ts`:

Replace:

```ts
import type { MusicalIntentFrame, MusicalEvent } from '../mapping/types'
```

With:

```ts
import type { RenderPacket, RenderEvent } from '../render/types'
```

### 4.2 Rename method for semantics (recommended)
Rename:

- `handleIntent(intent: MusicalIntentFrame)`  
to:
- `handleRender(cmd: RenderPacket)`

(If changing method name causes churn, you can keep `handleIntent` temporarily but it’s better to align.)

### 4.3 Apply changes
Replace usage inside:

- `this.applyPitch(intent.controls.pitchHz)` → `cmd.controls.pitchHz`
- `this.applyEvents(intent.events)` → `cmd.events`

Update `applyEvents` signature:

```ts
private applyEvents(events: RenderEvent[]) { ... }
```

Keep the `retrigger` branch since your engine already supports it.

### 4.4 Verify
- Build passes.
- `MonoSynthEngine` behavior unchanged.

---

## Step 5 — Update the app loop wiring

This step depends on your app entry file (where the pipeline is orchestrated). The goal is:

- Replace `V1Mapper` usage with `ReflexImpulseRendererV1`
- Replace `MusicalIntentFrame` with `RenderPacket`
- Call `monoSynth.handleRender(renderPacket)` each tick

### 5.1 Find the orchestrator
Search for:
- `new V1Mapper`
- `.handleIntent(`
- `MusicalIntentFrame`

Update accordingly.

### 5.2 Pseudocode target wiring

```ts
const intent = new IntentInterpreter() // V1 no-op
const reflex = new ReflexImpulseRendererV1()
const engine = new MonoSynthEngine()

loop(frame => {
  const sensorFrame = sensorHub.update(...)
  const featureFrame = featureExtractor.update(sensorFrame)
  const gestureEvents = gestureHub.update(featureFrame)

  // V1: compute bias but unused (keeps module boundary alive)
  const bias = intent.update(featureFrame.timestamp)

  // V1: reflex renders immediate commands
  const renderPacket = reflex.update(featureFrame, gestureEvents)

  engine.handleRender(renderPacket)
})
```

Notes:
- Keep `bias` computed even if unused (or wire it into reflex signature but ignored).
- This preserves the future architecture without V1 complexity.

### 5.3 Verify
- Run locally and confirm behavior matches baseline.

---

## Step 6 — Remove or deprecate old mapping types

Once the system compiles and runs:

### 6.1 Deprecate `musicroom/src/mapping/types.ts`
Options:
- Keep it for now but stop using it (safe).
- Or rename/move it to `render/types.ts` and delete the old file.

Recommendation:
- **Keep `mapping/scale.ts`** in mapping for now (it’s a utility).
- **Move types out** of mapping into `render/`.

### 6.2 Verify
- No remaining imports reference `mapping/types`.

---

## Step 7 — Add a small “architecture guardrail” (recommended)

Add a simple comment header to each module to prevent future coupling:

- `sensing/` and `features/` should not import from `audio/`
- `intent/` should not import from `audio/`
- `reflex/` may import from `mapping/scale` utilities but should not import from `audio/`
- `audio/` should only depend on `render/types` (and config)

This keeps layers clean.

---

## Step 8 — Optional: Add a small test harness / logging

To ensure V1 didn’t change:

- Log `RenderPacket.events` and `controls.pitchHz` when debug flags enabled.
- Confirm:
  - `MOVE_START` produces `noteOn`
  - `DIRECTION_CHANGE_X` produces a note break + noteOn
  - `pitchHz` changes smoothly with hand height (due to pitch slew)

---

## Notes on V2/V3 readiness

This refactor prepares for later versions:

- V2: IntentInterpreter begins emitting BiasState updates (register bias, density target, stability, etc.)
- V3: Engine becomes stateful with pattern persistence and controlled randomness
- Reflex can evolve from “note events” toward “perturbations” without rewriting audio plumbling

---

## Quick Verification Checklist (Run after refactor)

1. Build/typecheck passes.
2. Dev server runs.
3. Audio starts after user gesture (browser audio unlock still required).
4. First MOVE_START triggers a note.
5. DIRECTION_CHANGE_X retriggers the note.
6. Hand height modulates pitch as before.
7. No new latency introduced (still feels responsive).

---

## Suggested File Structure After Refactor

```
src/
  sensing/
  features/
  gestures/
  intent/
    types.ts
    IntentInterpreter.ts
  reflex/
    ReflexImpulseRendererV1.ts
  render/
    types.ts
  mapping/
    scale.ts
  audio/
    MonoSynthEngine.ts
    AudioEngine.ts
  app/
    config.ts
```

---

## Implementation Notes (Common Pitfalls)

- WebAudio requires user interaction: keep your existing resume/unlock flow.
- Ensure `MonoSynthEngine.ensureContext()` is called before scheduling.
- Be careful when renaming exported types; update all imports.
- Keep `retrigger` in render event types even if V1 doesn’t emit it yet.

---

## End State

After this refactor, the system is still V1, but the codebase is now aligned with the architecture:
- Sensing/features produce usable signals
- Reflex renders immediate commands
- Music engine renders sound
- Intent interpreter exists as a stable extension point

This enables V2 and V3 without another major rewrite.
