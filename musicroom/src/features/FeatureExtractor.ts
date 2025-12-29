// FeatureExtractor consumes SensorFrame data and emits smoothed hand kinematic features for downstream motion/gesture analysis.
import { CONFIG } from "../app/config";
import type { Hand2D, SensorFrame } from "../sensing/types";
import type { FeatureFrame } from "./types";
import { emaVector } from "./filters";

type Vec2 = { x: number; y: number };

// Takes SensorFrame and returns FeatureFrame.
export class FeatureExtractor {
  private lastTimestamp: number | null = null;
  private lastPosition: Vec2 | null = null;
  private lastVelocity: Vec2 | null = null;

  update(frame: SensorFrame): FeatureFrame | null {
    const leftHandFeature = this.getLeftHandFeature(frame);
    if (!leftHandFeature) {
      return null;
    }

    const featureFrame: FeatureFrame = {
      timestamp: frame.timestamp,
      features: {
        leftHand: leftHandFeature,
      },
    };

    return featureFrame;
  }

  private getLeftHandFeature(
    frame: SensorFrame,
  ): FeatureFrame["features"]["leftHand"] | null {
    const hand = this.getNthHand(frame, 0);
    if (!hand) {
      return null;
    }

    // Position

    const rawPosition: Vec2 = { x: hand.x, y: hand.y };
    const position = this.lastPosition
      ? emaVector(
          rawPosition,
          this.lastPosition,
          CONFIG.filters.positionEMAAlpha,
        )
      : rawPosition;

    // Velocity

    const dtSeconds = this.getDeltaSeconds(frame.timestamp);

    const rawVelocity =
      this.lastPosition && dtSeconds > 0
        ? {
            x: (position.x - this.lastPosition.x) / dtSeconds,
            y: (position.y - this.lastPosition.y) / dtSeconds,
          }
        : { x: 0, y: 0 };

    const velocity = this.lastVelocity
      ? emaVector(
          rawVelocity,
          this.lastVelocity,
          CONFIG.filters.velocityEMAAlpha,
        )
      : rawVelocity;

    // Speed

    const speed = Math.hypot(velocity.x, velocity.y);

    this.lastTimestamp = frame.timestamp;
    this.lastPosition = position;
    this.lastVelocity = velocity;

    return {
      position,
      velocity,
      speed,
      confidence: hand.confidence,
    };
  }

  private getNthHand(frame: SensorFrame, n: number): Hand2D | null {
    const source = frame.sources.camera_0;
    return source.hands2d?.[n] ?? null;
  }

  private getDeltaSeconds(timestamp: number) {
    if (!this.lastTimestamp) {
      return 0;
    }

    return Math.max(
      (timestamp - this.lastTimestamp) / 1000,
      CONFIG.filters.minDtSeconds,
    );
  }
}
