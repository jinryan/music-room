# music-room
The room is an instrument. Dance to play the instrument.

## Architecture Overview
This codebase is organized as a layered pipeline from sensing to sound. Each layer produces typed data that feeds the next layer, keeping the system easy to extend.

## Data Flow
```
CameraSource
  -> HandLandmarkerSensor
    -> SensorFrame
      -> FeatureExtractor
        -> FeatureFrame
          -> Gesture Detectors
            -> GestureEvent[]
              -> V1Mapper
                -> MusicalIntentFrame
                  -> MonoSynthEngine
```

### 1) Sensing
Files in `musicroom/src/sensing` handle camera input and convert raw frames into a `SensorFrame`.
- `CameraSource` owns the camera stream and mirrored frame buffer.
- `HandLandmarkerSensor` runs MediaPipe Tasks Vision (Hand Landmarker) and outputs hand landmarks.
- `SensorHub` aggregates one or more sensors into a single `SensorFrame`.
- Types live in `musicroom/src/sensing/types.ts`.

### 2) Features
Files in `musicroom/src/features` smooth raw sensor data and derive continuous features.
- `FeatureExtractor` applies EMA smoothing, computes velocity, and speed.
- Feature data is stored in `FeatureFrame` (`musicroom/src/features/types.ts`).

### 3) Gestures
Files in `musicroom/src/gestures` convert continuous features into discrete events.
- `MovementOnsetDetector` emits `MOVE_START`.
- `DirectionChangeDetector` emits `DIRECTION_CHANGE_X`.
- `GestureBus` stores the most recent gesture for UI/debug.
- Gesture event types live in `musicroom/src/gestures/types.ts`.

### 4) Mapping
Files in `musicroom/src/mapping` translate gestures + features into musical intent.
- `V1Mapper` maintains note state and produces `MusicalIntentFrame`.
- Pitch is derived from hand height with a scale mapping (`musicroom/src/mapping/scale.ts`).
- Musical intent types live in `musicroom/src/mapping/types.ts`.

### 5) Audio
Files in `musicroom/src/audio` render musical intent with Web Audio.
- `MonoSynthEngine` is a simple mono synth (sine oscillator + envelope).
- `AudioEngine` defines the interface.

### 6) UI / Debug Overlay
Files in `musicroom/src/ui` draw the overlay and expose live debug values.
- `DebugOverlay` shows raw and smoothed hand position, velocity, and HUD values.

## Configuration
All tunable parameters live in `musicroom/src/app/config.ts`. The intent is to keep every threshold and UI constant in one place for easy iteration.

Key sections:
- `filters`: EMA smoothing and minimum delta time.
- `detectors`: thresholds for movement onset and direction change.
- `mapping`: pitch range and scale/mode behavior.
- `audio`: envelope timings and pitch slew.
- `debug`: logging toggles (loop/gestures/intents).
- `ui`: overlay colors, sizes, and HUD defaults.

## How To Run
From the Vite app directory:
```
cd musicroom
npm install
npm run dev
```

Open the local URL shown in the terminal. Click/tap once to unlock audio, then move your hand in view of the camera.
