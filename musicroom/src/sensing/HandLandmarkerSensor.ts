import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from "@mediapipe/tasks-vision";
import type { Hand2D, RawSensorData } from "./types";
import type { CameraSource } from "./CameraSource";

const DEFAULT_WASM_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm";
const DEFAULT_MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export class HandLandmarkerSensor {
  private camera: CameraSource;
  private landmarker: HandLandmarker | null = null;
  private lastHands: Hand2D[] = [];

  constructor(camera: CameraSource) {
    this.camera = camera;
  }

  async init() {
    const vision = await FilesetResolver.forVisionTasks(DEFAULT_WASM_PATH);
    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: DEFAULT_MODEL_PATH,
      },
      runningMode: "VIDEO",
      numHands: 1,
    });
  }

  readFrame(timestamp: number): RawSensorData {
    const inputFrame = this.camera.captureMirroredFrame();
    if (!inputFrame) {
      return { kind: "camera.hand2d", hands2d: this.lastHands };
    }

    if (!this.landmarker) {
      return { kind: "camera.hand2d", hands2d: this.lastHands };
    }

    const result = this.landmarker.detectForVideo(inputFrame, timestamp);

    this.lastHands = this.extractHands(result);

    return { kind: "camera.hand2d", hands2d: this.lastHands };
  }

  private extractHands(result: HandLandmarkerResult): Hand2D[] {
    const hands: Hand2D[] = [];
    const landmarks = result.landmarks ?? [];
    const handednesses = result.handednesses ?? [];

    for (let i = 0; i < landmarks.length; i += 1) {
      const handLandmarks = landmarks[i];
      if (!handLandmarks || handLandmarks.length === 0) {
        continue;
      }

      const anchor = handLandmarks[0];
      const handedness = handednesses[i]?.[0];
      const confidence = handedness?.score ?? 0;
      const rawLabel =
        handedness?.categoryName ?? handedness?.displayName ?? "";
      const label =
        rawLabel === "Left" || rawLabel === "Right" ? rawLabel : "Unknown";

      hands.push({
        x: anchor.x,
        y: anchor.y,
        confidence,
        handedness: label,
      });
    }

    return hands;
  }
}
