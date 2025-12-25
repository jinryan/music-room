import { CONFIG } from "../../app/config";
import type { FeatureFrame } from "../../features/types";
import type { GestureEvent, GestureDetector, KinematicFeature } from "../types";

type MovementOnsetDetectorOptions = {
  sourceLabel: string;
  selectFeature: (frame: FeatureFrame) => KinematicFeature | null;
};

export class MovementOnsetDetector implements GestureDetector {
  private options: MovementOnsetDetectorOptions;
  private isMoving = false;
  private counter = 0;

  constructor(options: MovementOnsetDetectorOptions) {
    this.options = options;
  }

  update(frame: FeatureFrame): GestureEvent[] {
    const feature = this.options.selectFeature(frame);
    const events: GestureEvent[] = [];

    if (!feature) {
      return events;
    }

    const speed = feature.speed;

    if (!this.isMoving && speed >= CONFIG.detectors.move.startSpeed) {
      this.isMoving = true;
      events.push({
        id: this.nextId("MOVE_START"),
        type: "MOVE_START",
        timestamp: frame.timestamp,
        confidence: feature.confidence,
        sourceFeatures: [this.options.sourceLabel],
        data: {
          speed,
        },
      });
    }

    if (this.isMoving && speed <= CONFIG.detectors.move.stopSpeed) {
      this.isMoving = false;
      events.push({
        id: this.nextId("MOVE_END"),
        type: "MOVE_END",
        timestamp: frame.timestamp,
        confidence: feature.confidence,
        sourceFeatures: [this.options.sourceLabel],
        data: {
          speed,
        },
      });
    }

    return events;
  }

  private nextId(type: GestureEvent["type"]) {
    this.counter += 1;
    return `${type}-${this.counter}`;
  }
}
