import { CONFIG } from "./config";
import { CameraSource } from "../sensing/CameraSource";
import { HandLandmarkerSensor } from "../sensing/HandLandmarkerSensor";
import { FeatureExtractor } from "../features/FeatureExtractor";
import { DebugOverlay } from "../ui/DebugOverlay";
import { GestureBus } from "../gestures/GestureBus";
import { createGesturePipeline } from "../gestures/gesturePipeline";
import { IntentInterpreter } from "../intent/IntentInterpreter";
import { ReflexImpulseRendererV1 } from "../reflex/ReflexImpulseRendererV1";
import { MonoSynthEngine } from "../engine/MonoSynthEngine";
import type { BiasControls } from "../intent/types";
import type { RenderEvent } from "../render/types";
import { SensorHub } from "../sensing/SensorHub";

type FrameStats = {
  lastTimestamp: number;
  frameCount: number;
  lastLogTime: number;
};

export async function bootApp() {
  const { video, overlay } = setupDom();
  const camera = new CameraSource(video);
  const sensor = new HandLandmarkerSensor(camera);
  const sensorHub = new SensorHub();
  const featureExtractor = new FeatureExtractor();
  const gestureBus = new GestureBus();
  const detectGestures = createGesturePipeline();
  const intent = new IntentInterpreter();
  const reflex = new ReflexImpulseRendererV1();
  const audio = new MonoSynthEngine();

  await camera.init();
  await sensor.init();
  sensorHub.register("camera_0", sensor);
  overlay.resize(window.innerWidth, window.innerHeight);
  window.addEventListener("resize", () =>
    overlay.resize(window.innerWidth, window.innerHeight),
  );
  document.addEventListener("pointerdown", () => {
    audio.resume().catch((error) => {
      console.warn("Failed to resume audio context", error);
    });
  });

  const stats: FrameStats = {
    lastTimestamp: performance.now(),
    frameCount: 0,
    lastLogTime: performance.now(),
  };

  let lastGestureType: string | null = null;
  let noteOnState: boolean | null = null;
  let pitchHz: number | null = null;

  const loop = (timestamp: number) => {
    // Update frame stats.
    const deltaMs = timestamp - stats.lastTimestamp;
    stats.lastTimestamp = timestamp;
    stats.frameCount += 1;

    // ========================================================
    // SENSOR AND FEATURE EXTRACTION PIPELINE
    // ========================================================

    // Read the sensor frame.
    const sensorFrame = sensorHub.readFrame(timestamp);

    // Extract features from the sensor frame.
    const featureFrame = featureExtractor.update(sensorFrame);

    // Detect gestures from the feature frame.
    const events = detectGestures(featureFrame);

    // Publish the gestures to the gesture bus.
    if (events.length > 0) {
      gestureBus.publish(events);
      if (CONFIG.debug.log.gestures) {
        events.forEach((event) =>
          console.info(`[gesture] ${event.type}`, event),
        );
      }
      lastGestureType = gestureBus.getLastEvent()?.type ?? null;
    }

    // ========================================================
    // INTENT INTERPRETER PIPELINE
    // ========================================================

    // Update the intent.
    const biasControls = intent.update(
      featureFrame,
      events,
      sensorFrame.timestamp,
    );

    // ========================================================
    // REFLEX IMPULSE RENDERER PIPELINE
    // ========================================================

    // Update the reflex.
    if (featureFrame) {
      const renderPacket = reflex.update(featureFrame, events);
      const packet = {
        ...renderPacket,
        controls: mergeControls(biasControls, renderPacket.controls),
      };
      pitchHz = packet.controls.pitchHz ?? null;
      noteOnState = updateNoteState(noteOnState, packet.events);

      // Audio Engine consumes the render packet.
      audio.handleRender(packet);
      if (packet.events.length > 0 && CONFIG.debug.log.render) {
        console.info("[render]", packet);
      }
    } else {
      noteOnState = null;
      pitchHz = null;
    }

    // Render the overlay.
    overlay.render(sensorFrame, featureFrame, {
      gestureType: lastGestureType,
      noteOn: noteOnState,
      pitchHz,
    });

    // Log the frame stats.
    if (
      CONFIG.debug.log.loop &&
      timestamp - stats.lastLogTime >= CONFIG.debug.log.logIntervalMs
    ) {
      const elapsed = timestamp - stats.lastLogTime;
      const fps = (stats.frameCount * 1000) / elapsed;
      const latencyBudgetMs = deltaMs;

      // Log once per second to avoid flooding the console.
      console.info(
        `[loop] fps=${fps.toFixed(1)} frameDeltaMs=${deltaMs.toFixed(
          2,
        )} latencyBudgetMs=${latencyBudgetMs.toFixed(2)}`,
      );

      stats.frameCount = 0;
      stats.lastLogTime = timestamp;
    }

    requestAnimationFrame(loop);
  };

  requestAnimationFrame(loop);
}

function setupDom(): { video: HTMLVideoElement; overlay: DebugOverlay } {
  const video = document.createElement("video");
  video.className = "camera-feed";
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;

  const root = document.querySelector<HTMLDivElement>("#app");
  if (!root) {
    throw new Error("Missing #app root element");
  }

  root.innerHTML = "";
  root.appendChild(video);
  const overlay = new DebugOverlay(root);

  return { video, overlay };
}

function updateNoteState(current: boolean | null, events: RenderEvent[]) {
  let next = current ?? false;
  for (const event of events) {
    if (event.type === "noteOn" || event.type === "retrigger") {
      next = true;
    } else if (event.type === "noteOff") {
      next = false;
    }
  }
  return next;
}

function mergeControls(
  biasControls: BiasControls,
  renderControls: Record<string, number>,
) {
  const controls: Record<string, number> = { ...renderControls };
  for (const key in biasControls) {
    const value = biasControls[key as keyof BiasControls];
    if (value !== undefined) {
      controls[key] = value;
    }
  }
  return controls;
}
