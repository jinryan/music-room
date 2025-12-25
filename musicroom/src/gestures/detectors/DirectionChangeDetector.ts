import { CONFIG } from "../../app/config";
import type { FeatureFrame } from "../../features/types";
import type { GestureDetector, GestureEvent, KinematicFeature } from "../types";

type DirectionChangeDetectorOptions = {
  axis: "x" | "y";
  sourceLabel: string;
  selectFeature: (frame: FeatureFrame) => KinematicFeature | null;
};

export class DirectionChangeDetector implements GestureDetector {
  private options: DirectionChangeDetectorOptions;
  private lastAxisValue: number | null = null;
  private lastTriggerTime: number = 0;
  private counter: number = 0;

  constructor(options: DirectionChangeDetectorOptions) {
    this.options = options;
  }

  update(frame: FeatureFrame): GestureEvent[] {
    const feature = this.options.selectFeature(frame);
    const events: GestureEvent[] = [];

    if (!feature) {
      return events;
    }

    const { velocity, speed, confidence } = feature;
    const axis = this.options.axis;
    const axisValue = velocity[axis];
    const eventType =
      axis === "x" ? "DIRECTION_CHANGE_X" : "DIRECTION_CHANGE_Y";

    // Noise filtering
    if (Math.abs(velocity[axis]) < CONFIG.detectors.direction.minAxisSpeed) {
      return events;
    }

    if (this.lastAxisValue) {
      const changedDirection = this.lastAxisValue * axisValue < 0;
      const cooldownReady =
        frame.timestamp - this.lastTriggerTime >=
        CONFIG.detectors.direction.cooldownMs;

      if (cooldownReady && changedDirection) {
        this.lastTriggerTime = frame.timestamp;
        events.push({
          id: this.nextId(eventType),
          type: eventType,
          timestamp: frame.timestamp,
          confidence,
          sourceFeatures: [this.options.sourceLabel],
          data: {
            speed,
            axis,
            lastValue: this.lastAxisValue,
            currentValue: axisValue,
          },
        });
      }
    }

    this.lastAxisValue = axisValue;

    return events;
  }

  private nextId(type: GestureEvent["type"]) {
    this.counter += 1;
    return `${type}-${this.counter}`;
  }
}
