# V2 Implementation Plan (step-by-step)

Source: `design_docs/v2_high_level.md`

Guiding goals: musical inertia, gesture-as-bias (not command), short-term musical memory, legible but non-deterministic behavior, human-ignited only.

## Milestone 0 — Baseline + Types
- [ ] Capture current V1 behavior as reference (short video or log traces of gesture → render → audio).
- [ ] Add `MotionContext` and `MotionDescriptor`/event types (new file under `musicroom/src/features`), including unified frame `{ timestamp, features, descriptors, events }`.
- [ ] Add top-level docstrings to main modules (AnalyzeMotion, Reflex, Intent, Music Engine) describing V2 responsibilities.

## Milestone 1 — AnalyzeMotion (producer-side aggregation)
- [ ] Implement `MotionAnalyzer` that consumes `FeatureFrame` and maintains a small ring buffer (10–20 frames) to compute:
  - descriptors: motion energy (speed × amplitude), continuity (smooth vs jittery), engagement state (moving/hover/absent)
  - events: MOVE_START/END, DIRECTION_CHANGE_X/Y (reuse detectors) emitted inside the unified context
- [ ] Integrate analyzer into the loop (`app/main.ts`): sensor frame → feature frame → motion context (features + descriptors + events).
- [ ] Expose last N contexts via a lightweight store for downstream consumers (intent, debug overlay).
- [ ] Unit tests: synthetic `FeatureFrame` sequences to assert descriptor values and event thresholds; ensure `MotionContext` always includes features + events together.

## Milestone 2 — Reflex Path updates
- [ ] Refactor `ReflexImpulseRendererV1` to accept `MotionContext` (not raw features + events) and keep current immediacy behavior.
- [ ] Expand controls emitted: allow pitch, brightness, articulation derived directly from descriptors (e.g., energy → brightness, continuity → articulation).
- [ ] Keep determinism and zero memory beyond frame; ensure note-on/off logic still works when `MotionContext` events lag.
- [ ] Unit tests: given `MotionContext` variants, assert render events/controls deterministically match expectations.

## Milestone 3 — Intent Interpreter V2 (bias over windows)
- [ ] Implement ring buffers for recent `MotionContext`s (hundreds of ms → seconds) plus exponential decay timers for inertia.
- [ ] Compute `BiasState` fields: textureDensity (engine event-rate preference), tonalStability (repetition/scale adherence), variation (randomness budget); decay toward neutral when no motion.
- [ ] Define update cadence slower than reflex (e.g., 30–60 Hz vs per-frame) and ensure overwrite-last semantics with timestamps.
- [ ] Wire intent into main loop, merging controls with reflex output (already scaffolded).
- [ ] Unit tests: feed recorded contexts and assert monotonic trends, inertia/decay timing, and that single impulses don’t override state.

## Milestone 4 — Music Engine (stateful core)
- [ ] Introduce an explicit `MusicEngine` module (can extend `MonoSynthEngine` or wrap it) that owns:
  - active notes/figures with decay timers
  - internal energy variable driven by render impulses + `BiasState`
  - persistence/decay rules that allow sound to linger and simplify when still
- [ ] API: `handleRender(packet, biasState)` or separate setters; never frame-based; human-ignited only.
- [ ] Implement bounded randomness for mutations/retriggers guided by biases (density/stability).
- [ ] Add decay model that trends to silence without reinforcement; ensure “stillness → simplification → fade” behavior.
- [ ] Tests: simulate impulse + bias sequences to assert persistence timing, decay to silence, and bounded randomness.

## Milestone 5 — Audio Engine extensions
- [ ] Add multiple timbral regimes (smooth vs articulated): map to waveform/filter/envelope presets.
- [ ] Expose continuous controls: envelope length, brightness, articulation; smooth parameter transitions except when retriggered.
- [ ] Ensure safe startup/teardown and resume behaviors remain.
- [ ] Tests: parameter transition snapshots (envelope/filter curves) and no discontinuities unless reflex-triggered.

## Milestone 6 — Integration + UX
- [ ] Update `DebugOverlay` to visualize `MotionContext` descriptors, last biases, and engine state (active notes/energy).
- [ ] Add scenario-based integration tests (playback-simulated contexts) for the four V2 scenarios in the design doc.
- [ ] Add quick manual scripts/recordings to exercise ignition → pause → decay and energy modulation loops.
- [ ] Refresh `README.md` with V2 behavior description and how to run tests/demos.

## Milestone 7 — Hardening
- [ ] Performance pass: ensure motion analyzer and intent buffers don’t allocate per-frame; profile frame time.
- [ ] Bounds/guardrails: clamp descriptor ranges, bias ranges, and ensure engine never self-starts without input.
- [ ] Logging/metrics flags for tuning thresholds; ensure defaults land in V2 “stateful but responsive” zone.
- [ ] Clean up TODOs, add type coverage, and stabilize public interfaces for V3 extensibility.
