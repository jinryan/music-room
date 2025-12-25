# V1 Room Instrument — Engineering Implementation Plan (Codex-Friendly)

**Goal:** Implement Version 1 of the “room instrument” with a **single camera** and **single hand**:
- Hand height → pitch (continuous)
- Hand movement onset → note on
- Sudden direction change → note break (note off + note on immediately)

**Primary UX requirement:** perceived instantaneous feedback (low latency) and high legibility.

---

## 0) Tech Stack

Browser + TypeScript
- **Runtime:** Chrome / Chromium (desktop)
- **Language:** TypeScript
- **Hand tracking:** MediaPipe Hands (or MediaPipe Tasks Vision)
- **Audio:** Web Audio API or Tone.js (either is fine)
- **UI:** Minimal HTML + Canvas overlay
- **Build:** Vite

**Focusing on:** fastest iterate + easy debug overlays + good enough latency.

---

## 1) Repository Layout (Extensible Architecture)

Create a modular structure where adding sensors/detectors later does not affect audio code.

```
/src
  /app
    main.ts                  # boot + wiring
    config.ts                # thresholds, scale, ranges
  /sensing
    CameraHandSensor.ts      # camera + hand landmark extraction
    types.ts                 # SensorFrame, RawSensorData
  /features
    FeatureExtractor.ts      # smoothing + derived features
    filters.ts               # EMA, low-pass filters
    types.ts                 # FeatureFrame
  /gestures
    GestureBus.ts            # pub/sub or event queue
    types.ts                 # GestureEvent
    detectors/
      MovementOnsetDetector.ts
      DirectionChangeDetector.ts
  /mapping
    V1Mapper.ts              # FeatureFrame + GestureEvents -> MusicalIntent
    types.ts                 # MusicalIntent
    scale.ts                 # scale quantization / pitch mapping helpers
  /audio
    AudioEngine.ts           # interface
    MonoSynthEngine.ts       # V1 synth
  /ui
    DebugOverlay.ts          # canvas overlay (hand pos, vectors, events)
index.html
```

**Verification:** Ensure each folder exports only typed interfaces and does not import from downstream layers (e.g., gestures should not import audio).

---

## 2) Core Data Structures (Must Implement First)

### 2.1 SensorFrame
Represents raw data from sensors at time `t`.

```ts
export type SensorFrame = {
  timestamp: number; // ms performance.now()
  sources: Record<string, RawSensorData>;
};

export type RawSensorData = {
  kind: "camera.hand2d"; // later: "imu.wrist", "camera.pose3d", etc.
  hands2d?: Array<...>;
};
```

### 2.2 FeatureFrame
Smoothed and derived continuous signals.

```ts
export type FeatureFrame = {
  timestamp: number;
  features: {
    hand: {
      position: { x: number; y: number };
      velocity: { x: number; y: number };
      speed: number;
      confidence: number;
    };
  };
};
```

### 2.3 GestureEvent
Event primitives. Must be sensor-agnostic and traceable.

```ts
export type GestureEvent = {
  id: string;
  type: string; // "MOVE_START" | "DIRECTION_CHANGE" | ...
  timestamp: number;
  confidence: number;
  sourceFeatures: string[]; // e.g. ["hand.velocity", "hand.speed"]
  data: Record<string, any>;
};
```

### 2.4 MusicalIntent
Intermediate representation between gestures and sound.

```ts
export type MusicalIntentFrame = {
  timestamp: number;

  // Discrete actions that happened at this timestamp
  events: MusicalEvent[];

  // Continuous controls (valid until next frame)
  controls: Record<string, number>;

  // Optional routing info (for later polyphony / multiple layers)
  target?: {
    voiceId?: string;      // e.g. "lead", "bass", "pad"
    channel?: string;      // e.g. "synth_0"
  };
};

export type MusicalEvent =
  | { type: "noteOn"; noteId: string }
  | { type: "noteOff"; noteId: string }
```

**Verification (Step 2):**
- TypeScript compiles.
- A dummy pipeline can create/print these objects without runtime errors.

---

## 3) Step-by-Step Implementation Plan

Each step includes:
- **Implementation tasks**
- **How to verify**
- **Acceptance criteria**

---

### Step 3.1 — Bootstrapping (Vite + TS + basic app loop)

**Tasks**
1. Create Vite + TS project.
2. Add an animation loop using `requestAnimationFrame`.
3. Print current FPS and latency budget info (timestamp deltas) to console.

**Verify**
- App runs in browser.
- Console shows `frameDeltaMs` around ~16 ms on a normal laptop.

**Acceptance**
- Stable loop without memory growth after 2 minutes.

---

### Step 3.2 — Camera capture + hand tracking (Sensor layer)

**Tasks**
1. Implement `CameraHandSensor`:
   - Request camera access.
   - Run MediaPipe Tasks Vision (Hand Landmarker) each frame (or at 30 fps).
   - Output normalized hand coordinates (0–1), origin top-left.
2. Generate `SensorFrame`:
   - `sources["camera_0"] = { kind: "camera.hand2d", hands2d: [{ x, y, confidence }] }`

**Verify**
- Render a debug dot on canvas at detected hand position.
- Show confidence value.

**Acceptance**
- Hand dot follows your hand with < ~100 ms perceived lag (rough check).
- Confidence drops when hand leaves frame.

---

### Step 3.3 — Feature extraction: smoothing + velocity (Feature layer)

**Tasks**
1. Implement smoothing filters:
   - Exponential moving average (EMA) for position.
2. Compute velocity:
   - `v = (pos_t - pos_{t-1}) / dt`
   - Smooth velocity lightly (optional).
3. Compute speed: `sqrt(vx^2 + vy^2)`.

**Verify**
- Debug overlay shows:
  - Smoothed position dot
  - Velocity vector arrow
  - Numeric speed readout

**Acceptance**
- When hand is still, speed ~0 with small jitter.
- When moving, velocity arrow direction matches movement.

---

### Step 3.4 — Gesture detectors (Gesture primitive layer)

Implement each detector as an independent module:
- Consumes `FeatureFrame`
- Emits `GestureEvent[]`

#### 3.4.1 MovementOnsetDetector → emits MOVE_START

**Logic (V1)**
- Detect transition: `speed` crosses upward past `MOVE_START_SPEED`
- Require “cooldown” to prevent retriggering until speed falls below `MOVE_STOP_SPEED` (hysteresis)

**Config example**
- `MOVE_START_SPEED = 0.8` (normalized units/sec; tune)
- `MOVE_STOP_SPEED = 0.4`

**Verify**
- Print events to console + overlay.
- Move hand: you should see a single MOVE_START when starting to move.

**Acceptance**
- No repeated triggers while continuously moving.
- Stillness resets the detector.

#### 3.4.2 DirectionChangeDetector → emits DIRECTION_CHANGE

**Logic (V1)**
- Only consider frames where `speed > DIR_MIN_SPEED`
- Compute angle between current velocity vector and previous velocity vector:
  - `angle = acos( dot(v1, v2) / (|v1||v2|) )`
- Trigger if `angle > DIR_CHANGE_ANGLE` (e.g. 70–100°)
- Add cooldown (e.g. 150–250 ms) to prevent rapid re-triggering.

**Config example**
- `DIR_MIN_SPEED = 0.6`
- `DIR_CHANGE_ANGLE_DEG = 80`
- `DIR_COOLDOWN_MS = 200`

**Verify**
- Perform clear zig-zag motions.
- See DIRECTION_CHANGE events occur at corners.

**Acceptance**
- Gentle curves should NOT trigger repeatedly.
- Sharp direction flips should trigger reliably.

---

### Step 3.5 — V1 Mapper: Features + GestureEvents → MusicalIntent

This module defines musical behavior but does not create sound.

**Tasks**
1. Maintain note state:
   - `isNoteOn: boolean`
2. On `MOVE_START`: set `noteOn=true` if not already on.
3. On `DIRECTION_CHANGE`: set `noteOff=true` and `noteOn=true` (same frame is fine).
4. Pitch:
   - Always compute pitchHz from hand height `y`:
     - Higher hand = higher pitch
     - Convert normalized `y` to pitch range in semitones or Hz
   - Output `pitchHz` continuously (even when note is off is okay, but synth may ignore).

**Pitch mapping (recommended)**
- Use a **scale** to keep musicality:
  - Pentatonic or Dorian
- Range: ~1.5–2 octaves max.
- Use either:
  - **Continuous glide** between nearest scale degrees (recommended), or
  - Quantized steps (more legible but can feel jumpy)

**Verify**
- Log `MusicalIntent` to console.
- Move hand up/down: pitchHz should increase/decrease smoothly.
- Start moving: noteOn fires once.
- Zig-zag corners: noteOff+noteOn fires at turns.

**Acceptance**
- Intent is predictable from motion.
- No spurious note triggers at rest.

---

### Step 3.6 — Audio Engine: Mono synth that reacts to MusicalIntent

**Tasks**
1. Implement `MonoSynthEngine`:
   - `noteOn`: start oscillator if not playing
   - `noteOff`: stop oscillator OR ramp to 0 quickly and restart on noteOn
2. Use an ADSR-like envelope:
   - Attack: 20–50 ms
   - Release: 50–120 ms
3. Pitch handling:
   - When note is on, set oscillator frequency to `pitchHz`
   - Use smooth automation (linear ramp in 20–50 ms) to avoid zipper noise

**Verify**
- You should hear:
  - Silence at rest (until MOVE_START)
  - Sustained tone while holding position (even if still after onset, depending on your choice)
  - New articulation when changing direction

**Acceptance**
- Subjective latency feels “immediate.”
- No clicks/pops.
- Pitch responds continuously to height.

---

### Step 3.7 — Debug UI Overlay (must-have)

**Tasks**
1. Draw:
   - Raw hand position (small dot)
   - Smoothed position (larger dot)
   - Velocity arrow
2. Display text:
   - speed
   - last gesture event type
   - note state (on/off)
   - pitch Hz / MIDI note

**Verify**
- Overlay matches what you hear.

**Acceptance**
- When something sounds wrong, overlay helps diagnose which layer is failing.

---

## 4) Configuration System (Extensibility Hook)

Create `/src/app/config.ts` with centralized parameters.

Example structure:
```ts
export const CONFIG = {
  sensing: {
    minConfidence: 0.5
  },
  filters: {
    positionEMAAlpha: 0.25
  },
  detectors: {
    move: { startSpeed: 0.8, stopSpeed: 0.4 },
    dir: { minSpeed: 0.6, angleDeg: 80, cooldownMs: 200 }
  },
  mapping: {
    pitch: {
      minMidi: 50,
      maxMidi: 74,
      scale: "pentatonic" as const
    }
  },
  audio: {
    attackMs: 30,
    releaseMs: 80,
    pitchSlewMs: 30
  }
};
```

**Verify**
- Changing config values changes behavior without code changes.

**Acceptance**
- All thresholds are tunable from one file.

---

## 5) Test & Verification Protocols

### 5.1 Manual gesture test suite (repeatable)

Perform each test and confirm both overlay and audio behavior.

1. **Rest:** hand still → no note (or sustained if you chose that behavior)
2. **Move start:** still → start moving → noteOn once
3. **Hold:** stop moving but keep hand visible → note continues or gracefully releases (choose one; document it)
4. **Pitch sweep:** raise/lower hand while note is on → pitch follows
5. **Corner:** move in a straight line then sharply reverse/turn → new note
6. **Curve:** draw a circle → should not constantly retrigger
7. **Out of frame:** remove hand → confidence drops → system mutes safely

**Acceptance**
- 1–6 behave as expected.
- 7 never produces runaway notes.

---

### 5.2 Latency sanity check (engineering-focused)

**Goal:** measure “motion to sound” roughly.

**Method A (simple)**
- Add a visual flash on MOVE_START.
- Listen for sound onset relative to flash.
- Should feel near-synchronous.

**Method B (semi-quantitative)**
- Record screen + audio with a phone at high FPS.
- Estimate delta between flash and audible onset.
- Target: < ~60 ms perceived; lower is better.

---

## 6) Extensibility Guidelines (So V2–V4 Don’t Break V1)

### Adding new sensors (IMU, more cameras)
- Add new `sensorId` and raw data fields in `RawSensorData`
- FeatureExtractor merges into `FeatureFrame` as new continuous features
- Detectors can opt-in to use new features without modifying audio

### Adding new gesture primitives
- Create a new detector module that emits new `GestureEvent.type`
- Mapper decides how to interpret it into MusicalIntent
- Audio remains unchanged

### Adding stochasticity (V3)
- Implement a `ModifierModule` between Mapper and Audio:
  - takes MusicalIntent and perturbs modifiers or timing within constraints
- Do NOT alter detector thresholds to “create chaos”

### Adding learned model (V4)
- Add an async “SlowModel” module that updates:
  - scale choice
  - pitch range
  - detector thresholds (carefully)
  - modifiers mapping
- It must never directly trigger noteOn/noteOff.
  - Only changes parameters and mapping curves.

---

## 7) Implementation Order Checklist (One-Line Tasks)

1. Project scaffold (Vite+TS)
2. Camera capture
3. MediaPipe Hands output → SensorFrame
4. Feature extraction (EMA + velocity)
5. GestureBus + detector interfaces
6. MovementOnsetDetector
7. DirectionChangeDetector
8. V1Mapper → MusicalIntent
9. MonoSynthEngine reacts to MusicalIntent
10. DebugOverlay
11. Config centralization
12. Manual test suite + tuning

---

## 8) “Done” Definition for V1

V1 is complete when:
- A non-musician can discover the mapping in < 30 seconds
- You can intentionally phrase by turning corners
- The instrument never “double triggers” accidentally during smooth motion
- Pitch feels stable (not jittery) and responsive (not laggy)
- Debug overlay makes problems diagnosable

---

## 9) Notes for Codex / Agent Execution

- Implement modules in the order above.
- After each module, run the app and verify with the specified checks.
- Keep all magic numbers in `config.ts`.
- Keep event types as string literals to allow future expansion.
- Avoid adding extra mappings in V1 even if tempting—finish the pipeline first.
